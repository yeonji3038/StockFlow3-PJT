"""
StockFlow AI - 수요예측 모델 (Prophet + LightGBM) vs 베이스라인 비교

구조:
1. Prophet  : store_id x product_option_id 조합별로 개별 모델 학습 (단변량 시계열)
              -> 추세/계절성을 자동으로 분해, 빠르게 베이스라인 대비 우위를 확인하는 용도
2. LightGBM : 전체 데이터를 하나의 모델로 학습 (다변량)
              -> 요일, 월, 행사 여부, lag/rolling 피처를 입력으로 사용
              -> 행사처럼 "외부 변수의 영향이 큰 구간"에서 Prophet 대비 강점을 보이는지 확인

평가 방식:
- 베이스라인(이동평균)과 동일하게 마지막 TEST_DAYS(30일)를 테스트 구간으로 분리
- 같은 MAE/RMSE 지표로 베이스라인 대비 개선폭을 비교
"""

import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from prophet import Prophet
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, mean_squared_error

TEST_DAYS = 30

# generate_data.py와 동일한 행사 기간 (실무에서는 프로모션 캘린더로 사전에 알 수 있는 정보)
EVENTS = [
    ("2025-01-25", "2025-01-28"),
    ("2025-03-15", "2025-03-18"),
    ("2025-07-20", "2025-07-25"),
    ("2025-09-30", "2025-10-03"),
    ("2025-11-28", "2025-11-30"),
    ("2025-12-24", "2025-12-26"),
]


def load_full_calendar(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = df[(df["type"] == "OUT") & (df["reason"] == "SALE") & (df["is_anomaly"] == 0)]
    df["created_at"] = pd.to_datetime(df["created_at"])

    daily = df.groupby(["store_id", "product_option_id", "created_at"])["quantity"].sum().reset_index()

    date_range = pd.date_range(daily["created_at"].min(), daily["created_at"].max(), freq="D")
    rows = []
    for (store_id, option_id), group in daily.groupby(["store_id", "product_option_id"]):
        series = group.set_index("created_at")["quantity"].reindex(date_range, fill_value=0)
        for date, qty in series.items():
            rows.append({"store_id": store_id, "product_option_id": option_id, "date": date, "quantity": qty})
    return pd.DataFrame(rows)


def is_event_day(date: pd.Timestamp) -> int:
    for start, end in EVENTS:
        if pd.Timestamp(start) <= date <= pd.Timestamp(end):
            return 1
    return 0


# ── Prophet (단변량) ──────────────────────────────────────
def run_prophet(full_df: pd.DataFrame) -> pd.DataFrame:
    results = []

    for (store_id, option_id), group in full_df.groupby(["store_id", "product_option_id"]):
        group = group.sort_values("date").reset_index(drop=True)
        train = group.iloc[:-TEST_DAYS]
        test = group.iloc[-TEST_DAYS:]

        prophet_train = train.rename(columns={"date": "ds", "quantity": "y"})[["ds", "y"]]

        model = Prophet(
            yearly_seasonality=False,  # 1년치 데이터로는 연간 계절성을 안정적으로 추정 불가 (Prophet 공식 권장: 2년 이상 필요)
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode="additive",
        )
        model.fit(prophet_train)

        future = test.rename(columns={"date": "ds"})[["ds"]]
        forecast = model.predict(future)
        pred = forecast["yhat"].clip(lower=0).values
        actual = test["quantity"].values

        for d, a, p in zip(test["date"], actual, pred):
            results.append({
                "store_id": store_id, "product_option_id": option_id,
                "date": d, "actual": a, "predicted": p,
            })

    return pd.DataFrame(results)


# ── LightGBM (다변량) ─────────────────────────────────────
def build_features(full_df: pd.DataFrame) -> pd.DataFrame:
    df = full_df.copy().sort_values(["store_id", "product_option_id", "date"])

    df["dayofweek"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)
    df["is_event"] = df["date"].apply(is_event_day)

    # lag/rolling 피처는 그룹별로 계산
    df["lag_7"] = df.groupby(["store_id", "product_option_id"])["quantity"].shift(7)
    df["rolling_mean_7"] = (
        df.groupby(["store_id", "product_option_id"])["quantity"]
        .transform(lambda s: s.shift(1).rolling(7).mean())
    )
    return df


def run_lightgbm(feat_df: pd.DataFrame) -> pd.DataFrame:
    feat_df = feat_df.dropna(subset=["lag_7", "rolling_mean_7"]).reset_index(drop=True)

    feature_cols = [
        "store_id", "product_option_id", "dayofweek", "month",
        "is_weekend", "is_event", "lag_7", "rolling_mean_7",
    ]

    cutoff_date = feat_df["date"].max() - pd.Timedelta(days=TEST_DAYS)
    train = feat_df[feat_df["date"] <= cutoff_date]
    test = feat_df[feat_df["date"] > cutoff_date]

    model = lgb.LGBMRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        random_state=42,
        verbosity=-1,
    )
    model.fit(
        train[feature_cols], train["quantity"],
        categorical_feature=["store_id", "product_option_id", "dayofweek", "month"],
    )

    pred = model.predict(test[feature_cols])
    pred = np.clip(pred, 0, None)

    result = test[["store_id", "product_option_id", "date", "quantity"]].copy()
    result["predicted"] = pred
    result = result.rename(columns={"quantity": "actual"})
    return result, model, feature_cols


def evaluate(name: str, df: pd.DataFrame):
    mae = mean_absolute_error(df["actual"], df["predicted"])
    rmse = np.sqrt(mean_squared_error(df["actual"], df["predicted"]))
    mean_actual = df["actual"].mean()
    print(f"[{name}] MAE={mae:.3f}  RMSE={rmse:.3f}  오차율={mae/mean_actual*100:.1f}%  (n={len(df):,})")
    return {"model": name, "MAE": mae, "RMSE": rmse, "error_rate(%)": mae / mean_actual * 100, "n": len(df)}


if __name__ == "__main__":
    print("일별 판매 시계열 로드 중...")
    full_df = load_full_calendar("../data/stock_history.csv")
    print(f"  -> {full_df['store_id'].nunique()}개 매장 x {full_df['product_option_id'].nunique()}개 옵션")

    print("\n[1/2] Prophet 학습 중 (조합별 개별 모델, 시간이 다소 걸릴 수 있음)...")
    prophet_result = run_prophet(full_df)
    prophet_result.to_csv("prophet_result.csv", index=False, encoding="utf-8-sig")

    print("\n[2/2] LightGBM 학습 중 (단일 다변량 모델)...")
    feat_df = build_features(full_df)
    lgb_result, lgb_model, feature_cols = run_lightgbm(feat_df)
    lgb_result.to_csv("lightgbm_result.csv", index=False, encoding="utf-8-sig")

    print("\n" + "=" * 60)
    print("[베이스라인 대비 비교 결과]")
    print("=" * 60)
    summary = []
    summary.append({"model": "베이스라인(이동평균)", "MAE": 1.724, "RMSE": 3.000, "error_rate(%)": 29.4, "n": 1650})
    summary.append(evaluate("Prophet", prophet_result))
    summary.append(evaluate("LightGBM", lgb_result))

    summary_df = pd.DataFrame(summary)
    summary_df.to_csv("demand_model_comparison.csv", index=False, encoding="utf-8-sig")
    print("\n" + summary_df.to_string(index=False))

    print("\n[LightGBM 피처 중요도]")
    importance = pd.Series(lgb_model.feature_importances_, index=feature_cols).sort_values(ascending=False)
    print(importance)

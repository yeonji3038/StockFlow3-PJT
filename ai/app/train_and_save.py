"""
StockFlow AI - 최종 모델 학습 및 저장

3, 4단계에서 검증한 LightGBM(수요예측), Isolation Forest(이상탐지)를
전체 데이터로 다시 학습시켜 FastAPI 서비스가 로드할 수 있는 형태로 저장한다.

추론 시점에는 "방금 들어온 새 데이터 한 건"만 가지고 lag/rolling 피처를
계산할 수 없으므로, 학습 시점에 group(store x product_option)별로
- 최근 7일 판매량 이력
- 평균/표준편차
를 함께 저장해두고, API가 그 값을 이용해 피처를 재구성한다.
"""

import json
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.ensemble import IsolationForest

DATA_PATH = "../data/stock_history.csv"
ARTIFACT_DIR = "artifacts"

EVENTS = [
    ("2025-01-25", "2025-01-28"),
    ("2025-03-15", "2025-03-18"),
    ("2025-07-20", "2025-07-25"),
    ("2025-09-30", "2025-10-03"),
    ("2025-11-28", "2025-11-30"),
    ("2025-12-24", "2025-12-26"),
]


def is_event_day(date: pd.Timestamp) -> int:
    for start, end in EVENTS:
        if pd.Timestamp(start) <= date <= pd.Timestamp(end):
            return 1
    return 0


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


def train_demand_model(full_df: pd.DataFrame):
    df = full_df.copy().sort_values(["store_id", "product_option_id", "date"])
    df["dayofweek"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)
    df["is_event"] = df["date"].apply(is_event_day)
    df["lag_7"] = df.groupby(["store_id", "product_option_id"])["quantity"].shift(7)
    df["rolling_mean_7"] = (
        df.groupby(["store_id", "product_option_id"])["quantity"]
        .transform(lambda s: s.shift(1).rolling(7).mean())
    )
    df = df.dropna(subset=["lag_7", "rolling_mean_7"]).reset_index(drop=True)

    feature_cols = ["store_id", "product_option_id", "dayofweek", "month", "is_weekend", "is_event", "lag_7", "rolling_mean_7"]
    model = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.05, max_depth=5, random_state=42, verbosity=-1)
    model.fit(df[feature_cols], df["quantity"],
              categorical_feature=["store_id", "product_option_id", "dayofweek", "month"])

    return model, feature_cols


def train_anomaly_model(raw_df: pd.DataFrame):
    df = raw_df.copy()
    df["created_at"] = pd.to_datetime(df["created_at"])
    df = df.sort_values(["store_id", "product_option_id", "created_at"]).reset_index(drop=True)

    group = df.groupby(["store_id", "product_option_id"])["quantity"]
    group_mean = group.transform("mean")
    group_std = group.transform("std")
    df["z_quantity"] = (df["quantity"] - group_mean) / group_std

    rolling_mean = (
        df.groupby(["store_id", "product_option_id"])["quantity"]
        .transform(lambda s: s.shift(1).rolling(7, min_periods=1).mean())
    )
    rolling_std = (
        df.groupby(["store_id", "product_option_id"])["quantity"]
        .transform(lambda s: s.shift(1).rolling(7, min_periods=1).std())
    )
    df["z_rolling_dev"] = ((df["quantity"] - rolling_mean) / rolling_std).replace([np.inf, -np.inf], 0).fillna(0)
    df["dayofweek"] = df["created_at"].dt.dayofweek
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)

    feature_cols = ["z_quantity", "z_rolling_dev", "dayofweek", "is_weekend"]
    contamination = raw_df["is_anomaly"].mean()
    model = IsolationForest(n_estimators=200, contamination=contamination, random_state=42)
    model.fit(df[feature_cols])

    return model, feature_cols


def build_group_stats(raw_df: pd.DataFrame) -> dict:
    """추론 시점에 lag/rolling 피처를 재구성하기 위해 group별 통계와 최근 7일 이력을 저장"""
    df = raw_df.copy()
    df["created_at"] = pd.to_datetime(df["created_at"])
    df = df.sort_values(["store_id", "product_option_id", "created_at"])

    stats = {}
    for (store_id, option_id), group in df.groupby(["store_id", "product_option_id"]):
        qty = group["quantity"]
        key = f"{store_id}_{option_id}"
        stats[key] = {
            "mean": float(qty.mean()),
            "std": float(qty.std()) if qty.std() > 0 else 1.0,
            "last_7": qty.tail(7).tolist(),
        }
    return stats


if __name__ == "__main__":
    print("데이터 로드 중...")
    raw_df = pd.read_csv(DATA_PATH)
    full_df = load_full_calendar(DATA_PATH)

    print("수요예측 모델(LightGBM) 학습 중...")
    demand_model, demand_features = train_demand_model(full_df)

    print("이상탐지 모델(Isolation Forest) 학습 중...")
    anomaly_model, anomaly_features = train_anomaly_model(raw_df)

    print("group별 통계(추론용) 생성 중...")
    group_stats = build_group_stats(raw_df)

    print("아티팩트 저장 중...")
    joblib.dump(demand_model, f"{ARTIFACT_DIR}/demand_model.pkl")
    joblib.dump(anomaly_model, f"{ARTIFACT_DIR}/anomaly_model.pkl")
    with open(f"{ARTIFACT_DIR}/group_stats.json", "w", encoding="utf-8") as f:
        json.dump(group_stats, f, ensure_ascii=False, indent=2)
    with open(f"{ARTIFACT_DIR}/meta.json", "w", encoding="utf-8") as f:
        json.dump({
            "demand_features": demand_features,
            "anomaly_features": anomaly_features,
            "events": EVENTS,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n완료. {ARTIFACT_DIR}/ 에 demand_model.pkl, anomaly_model.pkl, group_stats.json, meta.json 저장됨")
    print(f"group 수: {len(group_stats)}")

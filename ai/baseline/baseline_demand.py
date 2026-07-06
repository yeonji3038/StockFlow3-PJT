"""
StockFlow AI - 수요예측 베이스라인 (단순 이동평균)

목적:
- Prophet/LightGBM 도입 전, 가장 단순한 방식(최근 N일 평균)으로 기준 성능을 측정
- 이후 본모델과 비교할 때 "얼마나 개선됐는지"를 수치로 보여주는 근거가 됨

방법:
- store_id x product_option_id 조합별로 일별 판매량 시계열을 만든다 (결측일은 0으로 채움)
- 마지막 TEST_DAYS(30일)을 테스트 구간으로 분리
- 테스트 구간의 각 날짜를, 그 직전 WINDOW(7)일의 이동평균으로 예측
- 실제값과 예측값의 MAE(평균절대오차), RMSE를 계산
"""

import numpy as np
import pandas as pd

WINDOW = 7          # 이동평균 window
TEST_DAYS = 30       # 마지막 30일을 테스트 구간으로 사용


def load_daily_series(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    # 정상 판매만 사용 (reason=SALE 이어도 DATA_ERROR로 주입된 이상치는 is_anomaly=1 이므로 함께 제외)
    df = df[(df["type"] == "OUT") & (df["reason"] == "SALE") & (df["is_anomaly"] == 0)]
    df["created_at"] = pd.to_datetime(df["created_at"])

    # store_id x product_option_id x date 별 합계
    daily = df.groupby(["store_id", "product_option_id", "created_at"])["quantity"].sum().reset_index()
    return daily


def build_full_calendar(daily: pd.DataFrame) -> pd.DataFrame:
    """결측일(판매가 0건이라 row가 아예 없는 날)을 0으로 채워 완전한 일별 시계열을 만든다"""
    full_rows = []
    date_range = pd.date_range(daily["created_at"].min(), daily["created_at"].max(), freq="D")

    for (store_id, option_id), group in daily.groupby(["store_id", "product_option_id"]):
        series = group.set_index("created_at")["quantity"].reindex(date_range, fill_value=0)
        for date, qty in series.items():
            full_rows.append({
                "store_id": store_id,
                "product_option_id": option_id,
                "date": date,
                "quantity": qty,
            })
    return pd.DataFrame(full_rows)


def moving_average_baseline(full_df: pd.DataFrame) -> pd.DataFrame:
    results = []

    for (store_id, option_id), group in full_df.groupby(["store_id", "product_option_id"]):
        group = group.sort_values("date").reset_index(drop=True)
        n = len(group)
        test_start = n - TEST_DAYS

        for i in range(max(test_start, WINDOW), n):
            window_vals = group.loc[i - WINDOW:i - 1, "quantity"].values
            pred = window_vals.mean()
            actual = group.loc[i, "quantity"]

            results.append({
                "store_id": store_id,
                "product_option_id": option_id,
                "date": group.loc[i, "date"],
                "actual": actual,
                "predicted": pred,
                "abs_error": abs(actual - pred),
                "sq_error": (actual - pred) ** 2,
            })

    return pd.DataFrame(results)


if __name__ == "__main__":
    print("일별 판매 시계열 생성 중...")
    daily = load_daily_series("../data/stock_history.csv")
    full_df = build_full_calendar(daily)
    print(f"  -> {full_df['store_id'].nunique()}개 매장 x {full_df['product_option_id'].nunique()}개 옵션, "
          f"{full_df['date'].nunique()}일치 시계열 생성")

    print(f"\n이동평균 베이스라인 적용 중 (window={WINDOW}일, 테스트={TEST_DAYS}일)...")
    result_df = moving_average_baseline(full_df)
    result_df.to_csv("baseline_demand_result.csv", index=False, encoding="utf-8-sig")

    mae = result_df["abs_error"].mean()
    rmse = np.sqrt(result_df["sq_error"].mean())
    mean_actual = result_df["actual"].mean()

    print("\n[베이스라인 성능 - 이동평균]")
    print(f"  MAE  : {mae:.3f}")
    print(f"  RMSE : {rmse:.3f}")
    print(f"  실제 평균 판매량 대비 오차율(MAE/mean): {mae / mean_actual * 100:.1f}%")
    print(f"  (검증 대상 행 수: {len(result_df):,}개)")
    print("\n  -> 이 수치가 Prophet/LightGBM과 비교할 기준선(baseline)입니다.")

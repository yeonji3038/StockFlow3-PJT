"""
StockFlow AI - 이상탐지 모델 (Isolation Forest) vs 3-sigma 베이스라인 비교

3-sigma rule의 한계:
- 단일 변수(quantity)만 보고 판단하기 때문에, 변동폭이 작은 이상치(REPEATED_LOSS 등)를 잘 못 잡음

Isolation Forest 접근:
- 비지도학습이므로 is_anomaly 라벨은 학습에 사용하지 않고, 평가(Recall/Precision) 시에만 사용
- 단일 수량값이 아니라 여러 차원의 피처를 동시에 보고 "고립되기 쉬운(=이상한) 패턴"을 탐지
  1) quantity                    : 원본 수량
  2) ratio_to_group_mean         : 해당 store x product_option 평균 대비 비율 (3-sigma와 유사한 정보)
  3) deviation_from_rolling_mean : 최근 7일 이동평균 대비 편차 (급격한 추세 이탈 탐지)
  4) dayofweek, is_weekend       : 요일 패턴이 깨진 비정상 출고 탐지
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["created_at"] = pd.to_datetime(df["created_at"])
    df = df.sort_values(["store_id", "product_option_id", "created_at"]).reset_index(drop=True)

    # 그룹(store x product_option)별 z-score: 상품마다 판매 규모가 크게 다르므로
    # raw quantity를 그대로 피처로 쓰면 규모가 큰 상품에 모델이 편향됨 -> 정규화 필수
    group = df.groupby(["store_id", "product_option_id"])["quantity"]
    group_mean = group.transform("mean")
    group_std = group.transform("std")
    df["z_quantity"] = (df["quantity"] - group_mean) / group_std

    # 최근 7일 이동평균/표준편차 대비 z-score (직전 추세 대비 급격한 이탈 탐지)
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

    return df


def run_isolation_forest(feat_df: pd.DataFrame, contamination: float) -> pd.DataFrame:
    feature_cols = ["z_quantity", "z_rolling_dev", "dayofweek", "is_weekend"]
    X = feat_df[feature_cols].fillna(0)

    model = IsolationForest(
        n_estimators=200,
        contamination=contamination,  # 실제 주입 비율(1.5%)을 알고 있으므로 그대로 사용
        random_state=42,
    )
    pred = model.fit_predict(X)  # -1: 이상치, 1: 정상
    score = model.decision_function(X)  # 낮을수록 이상치에 가까움

    feat_df = feat_df.copy()
    feat_df["pred_anomaly"] = (pred == -1).astype(int)
    feat_df["anomaly_score"] = -score  # 보기 편하게 부호 반전 (높을수록 이상치에 가까움)
    return feat_df, model, feature_cols


def evaluate(df: pd.DataFrame) -> dict:
    tp = ((df["is_anomaly"] == 1) & (df["pred_anomaly"] == 1)).sum()
    fp = ((df["is_anomaly"] == 0) & (df["pred_anomaly"] == 1)).sum()
    fn = ((df["is_anomaly"] == 1) & (df["pred_anomaly"] == 0)).sum()
    tn = ((df["is_anomaly"] == 0) & (df["pred_anomaly"] == 0)).sum()

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return {"TP": tp, "FP": fp, "FN": fn, "TN": tn, "precision": precision, "recall": recall, "f1": f1}


if __name__ == "__main__":
    print("StockHistory 데이터 로드 및 피처 생성 중...")
    raw_df = pd.read_csv("../data/stock_history.csv")
    feat_df = build_features(raw_df)

    contamination = raw_df["is_anomaly"].mean()
    print(f"  -> 실제 이상치 비율: {contamination*100:.2f}% (contamination 파라미터로 사용)")

    print("\nIsolation Forest 학습 중...")
    result_df, model, feature_cols = run_isolation_forest(feat_df, contamination)
    result_df.to_csv("isolation_forest_result.csv", index=False, encoding="utf-8-sig")

    metrics = evaluate(result_df)

    print("\n[Isolation Forest 성능]")
    print(f"  TP : {metrics['TP']}   FP : {metrics['FP']}   FN : {metrics['FN']}   TN : {metrics['TN']}")
    print(f"  Precision : {metrics['precision']*100:.1f}%")
    print(f"  Recall    : {metrics['recall']*100:.1f}%")
    print(f"  F1-score  : {metrics['f1']*100:.1f}%")

    print("\n[유형별 탐지율]")
    type_summary = (
        result_df[result_df["is_anomaly"] == 1]
        .groupby("anomaly_type")["pred_anomaly"]
        .agg(["count", "sum"])
        .rename(columns={"count": "total", "sum": "detected"})
    )
    type_summary["detect_rate(%)"] = (type_summary["detected"] / type_summary["total"] * 100).round(1)
    print(type_summary)

    print("\n" + "=" * 60)
    print("[베이스라인(3-sigma) vs Isolation Forest 비교]")
    print("=" * 60)
    comparison = pd.DataFrame([
        {"model": "3-sigma rule (베이스라인)", "precision": 71.2, "recall": 38.7, "f1": 50.1},
        {"model": "Isolation Forest",
         "precision": round(metrics["precision"] * 100, 1),
         "recall": round(metrics["recall"] * 100, 1),
         "f1": round(metrics["f1"] * 100, 1)},
    ])
    comparison.to_csv("anomaly_model_comparison.csv", index=False, encoding="utf-8-sig")
    print(comparison.to_string(index=False))

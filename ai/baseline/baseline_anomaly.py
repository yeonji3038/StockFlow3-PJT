"""
StockFlow AI - 이상탐지 베이스라인 (3-sigma rule)

목적:
- Isolation Forest 도입 전, 가장 단순한 통계적 방식으로 기준 성능을 측정
- "왜 ML이 필요한가"를 수치로 증명하기 위한 근거 자료

방법:
- store_id x product_option_id 조합별로 quantity의 평균(mean), 표준편차(std)를 구한다
- 평균에서 3*표준편차 이상 벗어난 값을 이상치로 판정 (|x - mean| > 3*std)
- 우리가 generate_data.py에서 주입해둔 is_anomaly(ground truth)와 비교하여
  Recall(실제 이상치 중 몇 %를 잡아냈는지), Precision(예측 이상치 중 몇 %가 진짜였는지)을 계산
"""

import numpy as np
import pandas as pd


def detect_3sigma(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["pred_anomaly"] = 0

    for (store_id, option_id), group_idx in df.groupby(["store_id", "product_option_id"]).groups.items():
        group = df.loc[group_idx, "quantity"]
        mean = group.mean()
        std = group.std()

        if std == 0:
            continue

        z = (group - mean).abs() / std
        df.loc[group_idx, "pred_anomaly"] = (z > 3).astype(int)

    return df


def evaluate(df: pd.DataFrame) -> dict:
    tp = ((df["is_anomaly"] == 1) & (df["pred_anomaly"] == 1)).sum()
    fp = ((df["is_anomaly"] == 0) & (df["pred_anomaly"] == 1)).sum()
    fn = ((df["is_anomaly"] == 1) & (df["pred_anomaly"] == 0)).sum()
    tn = ((df["is_anomaly"] == 0) & (df["pred_anomaly"] == 0)).sum()

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return {
        "TP": tp, "FP": fp, "FN": fn, "TN": tn,
        "precision": precision, "recall": recall, "f1": f1,
    }


if __name__ == "__main__":
    print("StockHistory 데이터 로드 중...")
    df = pd.read_csv("../data/stock_history.csv")
    print(f"  -> 전체 {len(df):,}건 (실제 이상치 {df['is_anomaly'].sum()}건, {df['is_anomaly'].mean()*100:.2f}%)")

    print("\n3-sigma rule 적용 중...")
    result_df = detect_3sigma(df)
    result_df.to_csv("baseline_anomaly_result.csv", index=False, encoding="utf-8-sig")

    metrics = evaluate(result_df)

    print("\n[베이스라인 성능 - 3-sigma rule]")
    print(f"  TP(실제 이상치를 맞게 탐지) : {metrics['TP']}")
    print(f"  FP(정상인데 이상치로 오탐)  : {metrics['FP']}")
    print(f"  FN(이상치인데 놓침)        : {metrics['FN']}")
    print(f"  TN(정상을 정상으로 판단)   : {metrics['TN']}")
    print(f"  Precision : {metrics['precision']*100:.1f}%")
    print(f"  Recall    : {metrics['recall']*100:.1f}%")
    print(f"  F1-score  : {metrics['f1']*100:.1f}%")
    print("\n  -> 이 수치가 Isolation Forest와 비교할 기준선(baseline)입니다.")

    # 유형별 탐지율도 같이 확인 (어떤 이상치 패턴을 더 못 잡는지)
    print("\n[이상치 유형별 탐지율]")
    type_summary = (
        result_df[result_df["is_anomaly"] == 1]
        .groupby("anomaly_type")["pred_anomaly"]
        .agg(["count", "sum"])
        .rename(columns={"count": "total", "sum": "detected"})
    )
    type_summary["detect_rate(%)"] = (type_summary["detected"] / type_summary["total"] * 100).round(1)
    print(type_summary)

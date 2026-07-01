"""
StockFlow AI - FastAPI 서비스

엔드포인트:
- POST /predict/demand   : 특정 매장x옵션의 특정 날짜 예상 판매량 + 발주 추천량 반환
- POST /detect/anomaly   : 새로 발생한 재고 변동 이벤트가 이상치인지 점수와 함께 판정
- GET  /health           : 헬스체크 (k8s liveness/readiness probe 용)

Spring Boot 연동 시:
- 매장 서비스가 발주 화면을 띄울 때 /predict/demand 호출
- Kafka Consumer가 재고 변동 이벤트를 받을 때마다 /detect/anomaly 호출 후
  이상 판정 시 본사 서비스에 알림 이벤트 발행
"""

import json
from datetime import date as date_type

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="StockFlow AI Service", version="1.0.0")

# ── 모델/메타데이터 로드 (서버 시작 시 1회) ──────────────────
demand_model = joblib.load("artifacts/demand_model.pkl")
anomaly_model = joblib.load("artifacts/anomaly_model.pkl")

with open("artifacts/group_stats.json", encoding="utf-8") as f:
    GROUP_STATS = json.load(f)

with open("artifacts/meta.json", encoding="utf-8") as f:
    META = json.load(f)

EVENTS = [(pd.Timestamp(s), pd.Timestamp(e)) for s, e in META["events"]]


def is_event_day(d: pd.Timestamp) -> int:
    for start, end in EVENTS:
        if start <= d <= end:
            return 1
    return 0


def get_group_key(store_id: int, product_option_id: int) -> str:
    return f"{store_id}_{product_option_id}"


# ── 요청/응답 스키마 ─────────────────────────────────────
class DemandRequest(BaseModel):
    store_id: int = Field(..., example=1)
    product_option_id: int = Field(..., example=4)
    target_date: date_type = Field(..., example="2026-01-15")


class DemandResponse(BaseModel):
    store_id: int
    product_option_id: int
    target_date: date_type
    predicted_quantity: float
    recommended_order_quantity: int
    is_event_day: bool


class AnomalyRequest(BaseModel):
    store_id: int = Field(..., example=1)
    product_option_id: int = Field(..., example=4)
    quantity: float = Field(..., example=45)
    event_date: date_type = Field(..., example="2026-01-15")


class AnomalyResponse(BaseModel):
    store_id: int
    product_option_id: int
    quantity: float
    is_anomaly: bool
    anomaly_score: float  # 높을수록 이상치에 가까움


# ── 엔드포인트 ───────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict/demand", response_model=DemandResponse)
def predict_demand(req: DemandRequest):
    key = get_group_key(req.store_id, req.product_option_id)
    stats = GROUP_STATS.get(key)
    if stats is None:
        raise HTTPException(status_code=404, detail=f"학습 데이터에 없는 조합입니다: store_id={req.store_id}, product_option_id={req.product_option_id}")

    target = pd.Timestamp(req.target_date)
    last_7 = stats["last_7"]

    # 실서비스에서는 매일 배치로 group_stats를 최신화해서 lag/rolling을 정확히 맞추지만,
    # 여기서는 학습 시점 기준 최근 7일 이력으로 근사함
    lag_7 = last_7[0] if len(last_7) >= 7 else float(np.mean(last_7))
    rolling_mean_7 = float(np.mean(last_7))

    feature_row = pd.DataFrame([{
        "store_id": req.store_id,
        "product_option_id": req.product_option_id,
        "dayofweek": target.dayofweek,
        "month": target.month,
        "is_weekend": int(target.dayofweek >= 5),
        "is_event": is_event_day(target),
        "lag_7": lag_7,
        "rolling_mean_7": rolling_mean_7,
    }])[META["demand_features"]]

    pred = float(demand_model.predict(feature_row)[0])
    pred = max(0.0, pred)

    # 발주 추천량: 예측 수요에 약간의 안전재고(20%)를 더해 올림 처리
    recommended = int(np.ceil(pred * 1.2))

    return DemandResponse(
        store_id=req.store_id,
        product_option_id=req.product_option_id,
        target_date=req.target_date,
        predicted_quantity=round(pred, 2),
        recommended_order_quantity=recommended,
        is_event_day=bool(is_event_day(target)),
    )


@app.post("/detect/anomaly", response_model=AnomalyResponse)
def detect_anomaly(req: AnomalyRequest):
    key = get_group_key(req.store_id, req.product_option_id)
    stats = GROUP_STATS.get(key)
    if stats is None:
        raise HTTPException(status_code=404, detail=f"학습 데이터에 없는 조합입니다: store_id={req.store_id}, product_option_id={req.product_option_id}")

    event_date = pd.Timestamp(req.event_date)
    mean, std = stats["mean"], stats["std"]
    last_7 = stats["last_7"]

    z_quantity = (req.quantity - mean) / std
    rolling_mean = float(np.mean(last_7))
    rolling_std = float(np.std(last_7)) if np.std(last_7) > 0 else 1.0
    z_rolling_dev = (req.quantity - rolling_mean) / rolling_std

    feature_row = pd.DataFrame([{
        "z_quantity": z_quantity,
        "z_rolling_dev": z_rolling_dev,
        "dayofweek": event_date.dayofweek,
        "is_weekend": int(event_date.dayofweek >= 5),
    }])[META["anomaly_features"]]

    pred = anomaly_model.predict(feature_row)[0]  # -1: 이상치, 1: 정상
    score = float(-anomaly_model.decision_function(feature_row)[0])  # 높을수록 이상치에 가까움

    return AnomalyResponse(
        store_id=req.store_id,
        product_option_id=req.product_option_id,
        quantity=req.quantity,
        is_anomaly=bool(pred == -1),
        anomaly_score=round(score, 4),
    )

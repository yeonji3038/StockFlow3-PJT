"""
StockFlow AI - 시뮬레이션 데이터 생성기 (ERD 정합 버전, 의류 도메인)

ERD 반영 사항:
- 백화점 의류 도메인 (Product.season_id: SS25/FW25, ProductOption.size: XS/S/M/L/XL/XXL)
- 재고는 Product가 아닌 ProductOption(색상/사이즈 SKU) 단위로 관리됨
  -> StoreStock, WarehouseStock, StockHistory 전부 product_option_id를 FK로 사용
- 모든 재고 변동은 StockHistory 한 테이블에 기록됨
  -> type: IN, OUT, TRANSFER, RETURN, DISPOSE
  -> reason: ALLOCATION, ORDER, SALE, RETURN, DAMAGE, SEASON_END
  -> 판매 데이터 = type=OUT, reason=SALE 인 StockHistory row
- store_id는 정수 PK (Store 테이블과 동일한 타입)
- Brand, Category, Season 마스터도 함께 생성하여 ERD 전체 구조를 반영

생성 데이터:
1. brands.csv, categories.csv, seasons.csv : 마스터 데이터
2. products.csv          : 상품 마스터 (brand_id, category_id, season_id 포함)
3. product_options.csv   : 상품-옵션 마스터 (product_id, color, size)
4. stock_history.csv     : 매장별 일별 재고 변동 이력 (수요예측 + 이상탐지 학습용 원천 데이터)
                           -> is_anomaly 컬럼은 검증용 ground truth (실제 DB 컬럼 아님)
"""

import numpy as np
import pandas as pd
from datetime import datetime

np.random.seed(42)

START_DATE = datetime(2025, 1, 1)
END_DATE = datetime(2025, 12, 31)
DATES = pd.date_range(START_DATE, END_DATE, freq="D")

STORE_IDS = [1, 2, 3, 4, 5]  # ERD Store.id (정수 PK)

# ── 마스터 데이터 (ERD: Brand, Category, Season) ──────────
BRANDS = [
    {"id": 1, "name": "LEE"},
    {"id": 2, "name": "커버낫"},
    {"id": 3, "name": "브라운브레스"},
]

CATEGORIES = [
    {"id": 1, "name": "아우터"},
    {"id": 2, "name": "상의"},
    {"id": 3, "name": "하의"},
]

SEASONS = [
    {"id": 1, "name": "SS25", "type": "SS", "year": 2025},
    {"id": 2, "name": "FW25", "type": "FW", "year": 2025},
]

# 품목: 의류 카테고리별로 계절성 강도를 다르게 설계
# peak_month: 판매가 가장 많은 달 / season_strength: 계절성 강도 (0=무관, 1=매우 강함)
PRODUCTS = [
    {"product_id": 1, "name": "롱패딩",       "brand_id": 1, "category_id": 1, "season_id": 2,
     "base": 6,  "season_strength": 0.95, "peak_month": 1,
     "options": [{"color": "블랙", "size": "M"}, {"color": "블랙", "size": "L"}, {"color": "베이지", "size": "M"}]},
    {"product_id": 2, "name": "니트",         "brand_id": 2, "category_id": 2, "season_id": 2,
     "base": 12, "season_strength": 0.7,  "peak_month": 12,
     "options": [{"color": "네이비", "size": "M"}, {"color": "네이비", "size": "L"}]},
    {"product_id": 3, "name": "반팔티셔츠",   "brand_id": 2, "category_id": 2, "season_id": 1,
     "base": 22, "season_strength": 0.85, "peak_month": 7,
     "options": [{"color": "화이트", "size": "S"}, {"color": "화이트", "size": "M"}, {"color": "블랙", "size": "M"}]},
    {"product_id": 4, "name": "청바지",       "brand_id": 3, "category_id": 3, "season_id": 1,
     "base": 18, "season_strength": 0.15, "peak_month": 7,
     "options": [{"color": "블루", "size": "M"}, {"color": "블루", "size": "L"}]},
    {"product_id": 5, "name": "바람막이",     "brand_id": 1, "category_id": 1, "season_id": 1,
     "base": 9,  "season_strength": 0.5,  "peak_month": 4,
     "options": [{"color": "카키", "size": "M"}]},
]


def build_product_options():
    rows = []
    option_id = 1
    for p in PRODUCTS:
        n = len(p["options"])
        weights = np.random.dirichlet(np.ones(n) * 2)
        for opt, w in zip(p["options"], weights):
            rows.append({
                "product_option_id": option_id,
                "product_id": p["product_id"],
                "product_name": p["name"],
                "color": opt["color"],
                "size": opt["size"],
                "sku_code": f"SKU{p['product_id']:03d}-{opt['color'][:1]}-{opt['size']}",
                "demand_share": round(float(w), 3),
                "base": p["base"],
                "season_strength": p["season_strength"],
                "peak_month": p["peak_month"],
            })
            option_id += 1
    return pd.DataFrame(rows)


def build_products_master():
    return pd.DataFrame([{
        "product_id": p["product_id"],
        "name": p["name"],
        "brand_id": p["brand_id"],
        "category_id": p["category_id"],
        "season_id": p["season_id"],
        "status": "ACTIVE",
    } for p in PRODUCTS])


EVENTS = [
    {"name": "설날맞이세일",   "start": "2025-01-25", "end": "2025-01-28", "boost": 1.8},
    {"name": "봄신상세일",     "start": "2025-03-15", "end": "2025-03-18", "boost": 1.6},
    {"name": "여름세일",       "start": "2025-07-20", "end": "2025-07-25", "boost": 2.2},
    {"name": "추석맞이세일",   "start": "2025-09-30", "end": "2025-10-03", "boost": 1.9},
    {"name": "블랙프라이데이", "start": "2025-11-28", "end": "2025-11-30", "boost": 2.5},
    {"name": "연말세일",       "start": "2025-12-24", "end": "2025-12-26", "boost": 1.7},
]


def seasonal_factor(date, peak_month, strength):
    month_diff = min(abs(date.month - peak_month), 12 - abs(date.month - peak_month))
    return 1 + strength * np.cos(month_diff / 6 * np.pi)


def weekday_factor(date):
    return 1.15 if date.weekday() >= 5 else 1.0


def event_boost(date):
    for ev in EVENTS:
        if pd.Timestamp(ev["start"]) <= date <= pd.Timestamp(ev["end"]):
            return ev["boost"]
    return 1.0


def generate_stock_history(options_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    history_id = 1

    for store_id in STORE_IDS:
        store_factor = np.random.uniform(0.85, 1.15)

        for _, opt in options_df.iterrows():
            for date in DATES:
                season = seasonal_factor(date, opt["peak_month"], opt["season_strength"])
                weekday = weekday_factor(date)
                event = event_boost(date)
                noise = np.random.normal(1.0, 0.12)

                qty = opt["base"] * opt["demand_share"] * store_factor * season * weekday * event * noise
                qty = max(0, round(qty))
                if qty == 0:
                    continue

                rows.append({
                    "id": history_id,
                    "store_id": store_id,
                    "product_option_id": int(opt["product_option_id"]),
                    "type": "OUT",
                    "reason": "SALE",
                    "quantity": qty,
                    "created_at": date.strftime("%Y-%m-%d"),
                    "is_anomaly": 0,
                    "anomaly_type": None,
                })
                history_id += 1

    return pd.DataFrame(rows)


def inject_anomalies(history_df: pd.DataFrame) -> pd.DataFrame:
    n_total = len(history_df)
    n_anomalies = int(n_total * 0.015)
    idxs = np.random.choice(n_total, size=n_anomalies, replace=False)

    anomaly_types = ["THEFT_SPIKE", "DATA_ERROR", "OFF_HOURS_BULK", "REPEATED_LOSS"]

    for idx in idxs:
        normal_qty = history_df.at[idx, "quantity"]
        a_type = np.random.choice(anomaly_types)

        if a_type == "THEFT_SPIKE":
            history_df.at[idx, "quantity"] = int(normal_qty * np.random.uniform(5, 10))
            history_df.at[idx, "reason"] = "DAMAGE"
        elif a_type == "DATA_ERROR":
            history_df.at[idx, "quantity"] = int(np.random.choice([9999, 0]))
        elif a_type == "OFF_HOURS_BULK":
            history_df.at[idx, "quantity"] = int(normal_qty * np.random.uniform(4, 8))
            history_df.at[idx, "reason"] = "DAMAGE"
        elif a_type == "REPEATED_LOSS":
            history_df.at[idx, "quantity"] = int(normal_qty * np.random.uniform(2, 3))
            history_df.at[idx, "reason"] = "DAMAGE"

        history_df.at[idx, "is_anomaly"] = 1
        history_df.at[idx, "anomaly_type"] = a_type

    return history_df


if __name__ == "__main__":
    print("마스터 데이터 생성 중 (Brand/Category/Season)...")
    pd.DataFrame(BRANDS).to_csv("brands.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(CATEGORIES).to_csv("categories.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(SEASONS).to_csv("seasons.csv", index=False, encoding="utf-8-sig")

    print("상품 마스터 생성 중...")
    products_df = build_products_master()
    products_df.to_csv("products.csv", index=False, encoding="utf-8-sig")
    print(f"  -> {len(products_df)}개 상품 생성 완료 (products.csv)")

    print("상품-옵션 마스터 생성 중...")
    options_df = build_product_options()
    options_df.to_csv("product_options.csv", index=False, encoding="utf-8-sig")
    print(f"  -> {len(options_df)}개 옵션 생성 완료 (product_options.csv)")

    print("StockHistory 데이터 생성 중 (type=OUT, reason=SALE 기준)...")
    history_df = generate_stock_history(options_df)
    print(f"  -> {len(history_df):,}행 생성 완료")

    print("이상치 주입 중...")
    history_df = inject_anomalies(history_df)
    history_df.to_csv("stock_history.csv", index=False, encoding="utf-8-sig")

    print(f"  -> 주입된 이상치: {history_df['is_anomaly'].sum():,}건 ({history_df['is_anomaly'].mean()*100:.2f}%)")
    print("\n[요약]")
    print(f"기간: {START_DATE.date()} ~ {END_DATE.date()} ({len(DATES)}일)")
    print(f"매장 수: {len(STORE_IDS)}, 상품 수: {len(PRODUCTS)}, 옵션 수: {len(options_df)}")
    print(f"행사 기간: {len(EVENTS)}건")

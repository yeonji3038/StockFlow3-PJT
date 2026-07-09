package com.stockflow.hq.domain.report.dto;

/**
 * 매장별 발주 효율 = 판매수량 / 발주수량.
 * 1.0에 가까울수록 발주량과 판매량이 균형, 1.0보다 많이 낮으면 과발주(재고 적체) 신호.
 */
public record StoreOrderEfficiencyDto(
        Long storeId,
        String storeName,
        Long orderedQuantity,
        Long soldQuantity,
        Double fulfillmentRate,
        Long aiRecommendedQuantity
) {
}
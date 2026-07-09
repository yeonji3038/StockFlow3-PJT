package com.stockflow.hq.domain.report.dto;

/**
 * 상품별 판매 집계. 수량 기준/매출 기준 Top5는 서비스 레이어에서
 * 이 리스트를 각각 다른 기준으로 정렬해서 뽑는다 (쿼리는 한 번만 실행).
 */
public record ProductSalesAggregateDto(
        Long productId,
        String productName,
        Long totalQuantity,
        Long totalRevenue
) {
}
package com.stockflow.hq.domain.report.dto;

/**
 * 매장별 기간 내 총 발주(입고완료) 수량. 판매 수량과 합쳐서
 * StoreOrderEfficiencyDto 계산에 쓰인다.
 */
public record StoreOrderVolumeDto(
        Long storeId,
        String storeName,
        Long orderedQuantity
) {
}
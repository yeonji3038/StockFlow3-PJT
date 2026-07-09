package com.stockflow.hq.domain.report.dto;

import java.time.LocalDate;

/**
 * 매장별 일자별 판매 집계 (주간 판매 추이 그래프의 원시 데이터)
 */
public record DailyStoreSalesDto(
        Long storeId,
        String storeName,
        LocalDate salesDate,
        Long quantity,
        Long revenue
) {
}
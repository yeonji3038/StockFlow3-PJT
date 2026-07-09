package com.stockflow.hq.domain.report.dto;

import java.time.LocalDateTime;

public record StoreSaleRawDto(
        Long storeId,
        String storeName,
        Long productOptionId,
        LocalDateTime soldAt,
        Integer quantity,
        Integer price
) {
}
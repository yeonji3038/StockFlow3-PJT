package com.stockflow.hq.domain.anomaly.dto;

import com.stockflow.hq.domain.anomaly.entity.AnomalyAlert;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class AnomalyAlertResponseDto {

    private Long id;
    private Long storeId;
    private String storeName;
    private Long productOptionId;
    private String skuCode;
    private String productName;
    private Double quantity;
    private String reason;
    private LocalDate eventDate;
    private Double anomalyScore;
    private Boolean resolved;
    private LocalDateTime createdAt;

    public static AnomalyAlertResponseDto from(AnomalyAlert alert) {
        return AnomalyAlertResponseDto.builder()
                .id(alert.getId())
                .storeId(alert.getStoreId())
                .storeName(alert.getStoreName())
                .productOptionId(alert.getProductOptionId())
                .skuCode(alert.getSkuCode())
                .productName(alert.getProductName())
                .quantity(alert.getQuantity())
                .reason(alert.getReason())
                .eventDate(alert.getEventDate())
                .anomalyScore(alert.getAnomalyScore())
                .resolved(alert.getResolved())
                .createdAt(alert.getCreatedAt())
                .build();
    }
}
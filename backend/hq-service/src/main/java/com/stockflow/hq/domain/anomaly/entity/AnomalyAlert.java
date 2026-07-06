package com.stockflow.hq.domain.anomaly.entity;

import com.stockflow.hq.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "anomaly_alerts")
public class AnomalyAlert extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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

    @Builder.Default
    private Boolean resolved = false;

    public void resolve() {
        this.resolved = true;
    }
}
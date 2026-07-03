package com.stockflow.hq.global.kafka.consumer;

import com.stockflow.common.kafka.dto.StockChangeEvent;
import com.stockflow.hq.domain.anomaly.service.AnomalyAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockEventConsumer {

    private final AnomalyAlertService anomalyAlertService;

    @KafkaListener(topics = "stock-change-events", groupId = "stockflow-group")
    public void consume(StockChangeEvent event) {

        log.info("[Kafka] 수신 - storeId: {}, productOptionId: {}, 변동량: {}, 현재고: {}, reason: {}",
                event.getStoreId(),
                event.getProductOptionId(),
                event.getChangedAmount(),
                event.getCurrentStock(),
                event.getReason());

        if (event.getCurrentStock() < 10) {
            log.warn("[Kafka] 재고 부족 경고 - productId: {}, 현재고: {}",
                    event.getProductId(), event.getCurrentStock());
        }

        try {
            anomalyAlertService.checkAndSave(event);
        } catch (Exception e) {
            log.error("[Kafka] 이상탐지 처리 중 오류 - productOptionId: {}, error: {}",
                    event.getProductOptionId(), e.getMessage());
        }
    }
}
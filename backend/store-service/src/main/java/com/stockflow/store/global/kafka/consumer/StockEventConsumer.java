package com.stockflow.store.global.kafka.consumer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import com.stockflow.common.kafka.dto.StockChangeEvent;

/**
 * store-service용 StockEventConsumer
 *
 * store-service는 AI 클라이언트(AiServiceClient)가 없으므로,
 * 이상탐지 AI 호출은 hq-service의 Consumer에서만 처리하고,
 * store-service에서는 재고 부족 경고 로그만 찍는 역할만 함.
 * (두 서비스가 같은 Kafka 토픽을 구독하지만 groupId가 달라야 중복 처리 방지)
 */
@Slf4j
@Service
public class StockEventConsumer {

    @KafkaListener(topics = "stock-change-events", groupId = "stockflow-store-group")
    public void consume(StockChangeEvent event) {

        log.info("[Kafka] 수신 - storeId: {}, productOptionId: {}, 변동량: {}, 현재고: {}, reason: {}",
                event.getStoreId(),
                event.getProductOptionId(),
                event.getChangedAmount(),
                event.getCurrentStock(),
                event.getReason());

        // 재고 부족 경고 (기존 로직 유지)
        if (event.getCurrentStock() < 10) {
            log.warn("[Kafka] 재고 부족 경고 - productId: {}, 현재고: {}",
                    event.getProductId(), event.getCurrentStock());
        }
    }
}
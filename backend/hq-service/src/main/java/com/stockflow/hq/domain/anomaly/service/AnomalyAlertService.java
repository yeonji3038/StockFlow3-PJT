package com.stockflow.hq.domain.anomaly.service;

import com.stockflow.common.kafka.dto.StockChangeEvent;
import com.stockflow.hq.domain.ai.client.AiServiceClient;
import com.stockflow.hq.domain.ai.dto.AiDto;
import com.stockflow.hq.domain.anomaly.dto.AnomalyAlertResponseDto;
import com.stockflow.hq.domain.anomaly.entity.AnomalyAlert;
import com.stockflow.hq.domain.anomaly.repository.AnomalyAlertRepository;
import com.stockflow.hq.domain.product.entity.ProductOption;
import com.stockflow.hq.domain.product.repository.ProductOptionRepository;
import com.stockflow.hq.domain.store.entity.Store;
import com.stockflow.hq.domain.store.repository.StoreRepository;
import com.stockflow.hq.global.exception.BusinessException;
import com.stockflow.hq.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnomalyAlertService {

    private final AiServiceClient aiServiceClient;
    private final AnomalyAlertRepository anomalyAlertRepository;
    private final StoreRepository storeRepository;
    private final ProductOptionRepository productOptionRepository;

    @Transactional
    public void checkAndSave(StockChangeEvent event) {
        if (event.getStoreId() == null || event.getProductOptionId() == null) {
            log.debug("[이상탐지] storeId/productOptionId 없음 - 이상탐지 대상 아님 (productId: {})",
                    event.getProductId());
            return;
        }

        LocalDate eventDate = event.getTimestamp() != null
                ? event.getTimestamp().toLocalDate()
                : LocalDate.now();

        AiDto.AnomalyResponse response = aiServiceClient.detectAnomaly(
                event.getStoreId(),
                event.getProductOptionId(),
                (double) Math.abs(event.getChangedAmount()),
                eventDate
        );

        if (response == null || !Boolean.TRUE.equals(response.getIsAnomaly())) {
            return;
        }

        log.warn("[이상탐지] 이상 감지 - storeId: {}, productOptionId: {}, score: {}",
                event.getStoreId(), event.getProductOptionId(), response.getAnomalyScore());

        String storeName = storeRepository.findById(event.getStoreId())
                .map(Store::getName)
                .orElse(null);

        ProductOption option = productOptionRepository.findById(event.getProductOptionId()).orElse(null);

        AnomalyAlert alert = AnomalyAlert.builder()
                .storeId(event.getStoreId())
                .storeName(storeName)
                .productOptionId(event.getProductOptionId())
                .skuCode(option != null ? option.getSkuCode() : null)
                .productName(option != null && option.getProduct() != null ? option.getProduct().getName() : null)
                .quantity(response.getQuantity())
                .reason(event.getReason())
                .eventDate(eventDate)
                .anomalyScore(response.getAnomalyScore())
                .resolved(false)
                .build();

        anomalyAlertRepository.save(alert);
    }

    public List<AnomalyAlertResponseDto> findAll() {
        return anomalyAlertRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(AnomalyAlertResponseDto::from)
                .toList();
    }

    public List<AnomalyAlertResponseDto> findUnresolved() {
        return anomalyAlertRepository.findByResolvedFalseOrderByCreatedAtDesc().stream()
                .map(AnomalyAlertResponseDto::from)
                .toList();
    }

    @Transactional
    public void resolve(Long id) {
        AnomalyAlert alert = anomalyAlertRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.ANOMALY_ALERT_NOT_FOUND));
        alert.resolve();
    }
}
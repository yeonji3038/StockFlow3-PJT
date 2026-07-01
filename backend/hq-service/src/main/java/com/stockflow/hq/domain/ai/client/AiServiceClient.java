package com.stockflow.hq.domain.ai.client;

import com.stockflow.hq.domain.ai.dto.AiDto;
import com.stockflow.hq.global.config.AiServiceConfig;
import com.stockflow.hq.global.exception.BusinessException;
import com.stockflow.hq.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiServiceClient {

    private final RestTemplate aiServiceRestTemplate;
    private final AiServiceConfig aiServiceConfig;

    /**
     * 수요예측 AI 호출 (발주 신청 화면에서 추천 발주량을 보여줄 때 사용)
     * AI 서버가 응답하지 않아도 발주 자체는 막히면 안 되므로,
     * 호출부(Controller)에서 예외를 잡아 "추천값 없음"으로 처리하도록 BusinessException을 던짐
     */
    public AiDto.DemandResponse predictDemand(Long storeId, Long productOptionId, LocalDate targetDate) {
        String url = aiServiceConfig.getAiServiceBaseUrl() + "/predict/demand";

        AiDto.DemandRequest request = AiDto.DemandRequest.builder()
                .storeId(storeId)
                .productOptionId(productOptionId)
                .targetDate(targetDate)
                .build();

        try {
            return aiServiceRestTemplate.postForObject(url, request, AiDto.DemandResponse.class);
        } catch (RestClientException e) {
            log.warn("[AI] 수요예측 호출 실패 - storeId: {}, productOptionId: {}, error: {}",
                    storeId, productOptionId, e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_UNAVAILABLE);
        }
    }

    /**
     * 이상탐지 AI 호출 (Kafka Consumer가 재고 변동 이벤트를 받을 때마다 사용)
     */
    public AiDto.AnomalyResponse detectAnomaly(Long storeId, Long productOptionId, Double quantity, LocalDate eventDate) {
        String url = aiServiceConfig.getAiServiceBaseUrl() + "/detect/anomaly";

        AiDto.AnomalyRequest request = AiDto.AnomalyRequest.builder()
                .storeId(storeId)
                .productOptionId(productOptionId)
                .quantity(quantity)
                .eventDate(eventDate)
                .build();

        try {
            return aiServiceRestTemplate.postForObject(url, request, AiDto.AnomalyResponse.class);
        } catch (RestClientException e) {
            log.warn("[AI] 이상탐지 호출 실패 - storeId: {}, productOptionId: {}, error: {}",
                    storeId, productOptionId, e.getMessage());
            // 이상탐지는 출고 자체를 막는 로직이 아니므로, 실패 시 null 반환하고 정상 흐름 계속
            return null;
        }
    }
}

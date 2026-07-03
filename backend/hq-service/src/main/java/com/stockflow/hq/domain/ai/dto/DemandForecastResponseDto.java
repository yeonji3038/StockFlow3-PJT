package com.stockflow.hq.domain.ai.dto;

import lombok.*;

import java.time.LocalDate;

// 프론트엔드로 내려줄 응답 전용 DTO.
// AiDto.DemandResponse는 FastAPI(snake_case) 응답을 받기 위한 내부 전용 DTO라서
// @JsonProperty가 붙어있는데, 그걸 그대로 컨트롤러 응답으로 쓰면
// 프론트로 나갈 때도 snake_case로 나가버림(어노테이션이 직렬화/역직렬화 양쪽에 다 적용됨).
// 그래서 순수 camelCase로만 나가는 별도 DTO를 만들어 프론트와의 계약을 분리함.
@Getter
@Builder
public class DemandForecastResponseDto {

    private Long storeId;
    private Long productOptionId;
    private LocalDate targetDate;
    private Double predictedQuantity;
    private Integer recommendedOrderQuantity;
    private Boolean isEventDay;

    public static DemandForecastResponseDto from(AiDto.DemandResponse response) {
        return DemandForecastResponseDto.builder()
                .storeId(response.getStoreId())
                .productOptionId(response.getProductOptionId())
                .targetDate(response.getTargetDate())
                .predictedQuantity(response.getPredictedQuantity())
                .recommendedOrderQuantity(response.getRecommendedOrderQuantity())
                .isEventDay(response.getIsEventDay())
                .build();
    }
}
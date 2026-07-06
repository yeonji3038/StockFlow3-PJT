package com.stockflow.hq.domain.ai.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

// 주의: FastAPI(Python/Pydantic)는 응답 필드를 snake_case(store_id 등)로 내려주는데
// Java는 camelCase(storeId) 컨벤션을 쓰므로, @JsonProperty로 명시적 매핑이 반드시 필요함.
// 이 매핑이 없으면 역직렬화 시 필드값이 전부 null로 들어옴
public class AiDto {

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemandRequest {
        @JsonProperty("store_id")
        private Long storeId;

        @JsonProperty("product_option_id")
        private Long productOptionId;

        @JsonProperty("target_date")
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate targetDate;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemandResponse {
        @JsonProperty("store_id")
        private Long storeId;

        @JsonProperty("product_option_id")
        private Long productOptionId;

        @JsonProperty("target_date")
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate targetDate;

        @JsonProperty("predicted_quantity")
        private Double predictedQuantity;

        @JsonProperty("recommended_order_quantity")
        private Integer recommendedOrderQuantity;

        @JsonProperty("is_event_day")
        private Boolean isEventDay;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnomalyRequest {
        @JsonProperty("store_id")
        private Long storeId;

        @JsonProperty("product_option_id")
        private Long productOptionId;

        private Double quantity;

        @JsonProperty("event_date")
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate eventDate;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnomalyResponse {
        @JsonProperty("store_id")
        private Long storeId;

        @JsonProperty("product_option_id")
        private Long productOptionId;

        private Double quantity;

        @JsonProperty("is_anomaly")
        private Boolean isAnomaly;

        @JsonProperty("anomaly_score")
        private Double anomalyScore;
    }
}

package com.stockflow.hq.domain.ai.controller;

import com.stockflow.hq.domain.ai.client.AiServiceClient;
import com.stockflow.hq.domain.ai.dto.AiDto;
import com.stockflow.hq.domain.ai.dto.DemandForecastResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiServiceClient aiServiceClient;

    // 발주 신청 화면에서 옵션별 추천 발주량을 보여줄 때 호출
    // 예: GET /api/ai/demand-forecast?storeId=1&productOptionId=4&targetDate=2026-01-15
    @GetMapping("/demand-forecast")
    public ResponseEntity<DemandForecastResponseDto> getDemandForecast(
            @RequestParam Long storeId,
            @RequestParam Long productOptionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate) {

        AiDto.DemandResponse response = aiServiceClient.predictDemand(storeId, productOptionId, targetDate);
        return ResponseEntity.ok(DemandForecastResponseDto.from(response));
    }
}

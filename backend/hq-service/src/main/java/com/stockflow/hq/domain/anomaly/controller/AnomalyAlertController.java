package com.stockflow.hq.domain.anomaly.controller;

import com.stockflow.hq.domain.anomaly.dto.AnomalyAlertResponseDto;
import com.stockflow.hq.domain.anomaly.service.AnomalyAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/anomaly-alerts")
@RequiredArgsConstructor
public class AnomalyAlertController {

    private final AnomalyAlertService anomalyAlertService;

    @GetMapping
    public ResponseEntity<List<AnomalyAlertResponseDto>> getAlerts(
            @RequestParam(required = false, defaultValue = "false") boolean unresolvedOnly) {
        List<AnomalyAlertResponseDto> alerts = unresolvedOnly
                ? anomalyAlertService.findUnresolved()
                : anomalyAlertService.findAll();
        return ResponseEntity.ok(alerts);
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<Void> resolveAlert(@PathVariable Long id) {
        anomalyAlertService.resolve(id);
        return ResponseEntity.noContent().build();
    }
}
package com.stockflow.hq.domain.report.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ReportFileSummaryDto(
        Long id,
        LocalDate periodStart,
        LocalDate periodEnd,
        String fileName,
        LocalDateTime createdAt
) {
}
package com.stockflow.hq.domain.report.dto;

import java.time.LocalDate;
import java.util.List;

public record WeeklyReportDto(
        LocalDate periodStart,
        LocalDate periodEnd,
        List<DailyStoreSalesDto> salesTrend,
        List<ProductSalesAggregateDto> topProductsByQuantity,
        List<ProductSalesAggregateDto> topProductsByRevenue,
        List<StoreOrderEfficiencyDto> orderEfficiency
) {
}
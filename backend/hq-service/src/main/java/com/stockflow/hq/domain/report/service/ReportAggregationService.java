package com.stockflow.hq.domain.report.service;

import com.stockflow.hq.domain.ai.client.AiServiceClient;
import com.stockflow.hq.domain.ai.dto.AiDto;
import com.stockflow.hq.domain.report.dto.*;
import com.stockflow.hq.domain.report.repository.OrderReportRepository;
import com.stockflow.hq.domain.report.repository.StockHistoryReportRepository;
import com.stockflow.hq.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportAggregationService {

    private static final int TOP_N = 5;

    private final StockHistoryReportRepository stockHistoryReportRepository;
    private final OrderReportRepository orderReportRepository;
    private final AiServiceClient aiServiceClient;

    public WeeklyReportDto generateWeeklyReport(LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime start = periodStart.atStartOfDay();
        LocalDateTime end = periodEnd.atStartOfDay();

        List<StoreSaleRawDto> rawSales =
                stockHistoryReportRepository.findRawStoreSales(start, end);
        List<DailyStoreSalesDto> salesTrend = groupByStoreAndDate(rawSales);

        List<ProductSalesAggregateDto> productSales =
                stockHistoryReportRepository.findProductSalesAggregate(start, end);

        List<StoreOrderVolumeDto> orderVolumes =
                orderReportRepository.findStoreOrderVolume(start, end);

        List<ProductSalesAggregateDto> topByQuantity = productSales.stream()
                .sorted(Comparator.comparingLong(ProductSalesAggregateDto::totalQuantity).reversed())
                .limit(TOP_N)
                .toList();

        List<ProductSalesAggregateDto> topByRevenue = productSales.stream()
                .sorted(Comparator.comparingLong(ProductSalesAggregateDto::totalRevenue).reversed())
                .limit(TOP_N)
                .toList();

        List<StoreOrderEfficiencyDto> orderEfficiency =
                buildOrderEfficiency(salesTrend, orderVolumes, rawSales, periodEnd);

        return new WeeklyReportDto(periodStart, periodEnd, salesTrend, topByQuantity, topByRevenue, orderEfficiency);
    }

    /**
     * 매장별 판매수량(salesTrend 합계)과 발주수량(orderVolumes)을 storeId 기준으로 매칭해
     * fulfillmentRate(판매/발주)를 계산한다. 한쪽에만 존재하는 매장도 0으로 채워서 누락 없이 포함한다.
     * 여기에 더해, 매장별로 실제 팔린 상품 옵션들에 대해 AI 수요예측을 호출해
     * "AI 추천 발주량" 합계도 같이 계산한다 (실제 발주 vs AI 추천 Before/After 비교용).
     */
    private List<StoreOrderEfficiencyDto> buildOrderEfficiency(List<DailyStoreSalesDto> salesTrend,
                                                               List<StoreOrderVolumeDto> orderVolumes,
                                                               List<StoreSaleRawDto> rawSales,
                                                               LocalDate targetDate) {
        Map<Long, String> storeNames = new LinkedHashMap<>();
        Map<Long, Long> soldByStore = new HashMap<>();
        Map<Long, Long> orderedByStore = new HashMap<>();

        for (DailyStoreSalesDto s : salesTrend) {
            storeNames.putIfAbsent(s.storeId(), s.storeName());
            soldByStore.merge(s.storeId(), s.quantity(), Long::sum);
        }
        for (StoreOrderVolumeDto o : orderVolumes) {
            storeNames.putIfAbsent(o.storeId(), o.storeName());
            orderedByStore.merge(o.storeId(), o.orderedQuantity(), Long::sum);
        }

        Map<Long, Set<Long>> soldOptionsByStore = new HashMap<>();
        for (StoreSaleRawDto row : rawSales) {
            soldOptionsByStore
                    .computeIfAbsent(row.storeId(), k -> new HashSet<>())
                    .add(row.productOptionId());
        }

        return storeNames.entrySet().stream()
                .map(e -> {
                    Long storeId = e.getKey();
                    long sold = soldByStore.getOrDefault(storeId, 0L);
                    long ordered = orderedByStore.getOrDefault(storeId, 0L);
                    Double rate = ordered == 0 ? null : (double) sold / ordered;
                    Long aiRecommended = sumAiRecommendedQuantity(
                            storeId, soldOptionsByStore.getOrDefault(storeId, Set.of()), targetDate);
                    return new StoreOrderEfficiencyDto(storeId, e.getValue(), ordered, sold, rate, aiRecommended);
                })
                .sorted(Comparator.comparing(StoreOrderEfficiencyDto::storeId))
                .collect(Collectors.toList());
    }

    /**
     * 매장의 이번 주 판매 옵션들에 대해 AI 수요예측(/predict/demand)을 옵션별로 호출해 합산한다.
     * AI 학습 데이터 범위(store_id 1~5, product_option_id 1~11) 밖의 조합은 AiServiceClient가
     * BusinessException(AI_SERVICE_UNAVAILABLE)을 던지는데, 그 옵션만 건너뛰고 나머지는 계속 집계한다.
     * 매장 전체가 범위 밖이라 하나도 성공 못하면 null(=리포트에 "N/A"로 표시)을 반환한다.
     */
    private Long sumAiRecommendedQuantity(Long storeId, Set<Long> productOptionIds, LocalDate targetDate) {
        if (productOptionIds.isEmpty()) {
            return null;
        }

        long total = 0;
        boolean anySuccess = false;

        for (Long productOptionId : productOptionIds) {
            try {
                AiDto.DemandResponse response =
                        aiServiceClient.predictDemand(storeId, productOptionId, targetDate);
                if (response != null && response.getRecommendedOrderQuantity() != null) {
                    total += response.getRecommendedOrderQuantity();
                    anySuccess = true;
                }
            } catch (BusinessException e) {
                log.debug("[리포트] AI 추천 발주량 조회 실패(학습 데이터 범위 밖일 수 있음) - storeId: {}, productOptionId: {}",
                        storeId, productOptionId);
            }
        }

        return anySuccess ? total : null;
    }

    /**
     * raw StockHistory 판매 행을 (storeId, 날짜) 기준으로 묶어서 일별 매장 판매 집계로 만든다.
     * DB의 date() 함수 대신 LocalDateTime::toLocalDate로 날짜만 추출 — Hibernate 버전에 상관없이 항상 동작.
     */
    private List<DailyStoreSalesDto> groupByStoreAndDate(List<StoreSaleRawDto> rawSales) {
        record Key(Long storeId, LocalDate date) {}

        Map<Key, String> storeNameByKey = new LinkedHashMap<>();
        Map<Key, Long> quantityByKey = new LinkedHashMap<>();
        Map<Key, Long> revenueByKey = new LinkedHashMap<>();

        for (StoreSaleRawDto row : rawSales) {
            Key key = new Key(row.storeId(), row.soldAt().toLocalDate());
            storeNameByKey.putIfAbsent(key, row.storeName());
            long revenue = (long) row.quantity() * row.price();
            quantityByKey.merge(key, (long) row.quantity(), Long::sum);
            revenueByKey.merge(key, revenue, Long::sum);
        }

        return storeNameByKey.keySet().stream()
                .map(key -> new DailyStoreSalesDto(
                        key.storeId(),
                        storeNameByKey.get(key),
                        key.date(),
                        quantityByKey.get(key),
                        revenueByKey.get(key)
                ))
                .sorted(Comparator.comparing(DailyStoreSalesDto::storeId)
                        .thenComparing(DailyStoreSalesDto::salesDate))
                .toList();
    }
}
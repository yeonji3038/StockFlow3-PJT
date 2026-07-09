package com.stockflow.hq.domain.report.repository;

import com.stockflow.hq.domain.report.dto.ProductSalesAggregateDto;
import com.stockflow.hq.domain.report.dto.StoreSaleRawDto;import com.stockflow.hq.domain.stockhistory.entity.StockHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 판매 = StockHistory 중 type=OUT(출고) & reason=SALE(판매)인 이력.
 * "판매량" 컬럼이 별도로 존재하지 않아 이 조합으로 판매를 식별한다.
 */
public interface StockHistoryReportRepository extends JpaRepository<StockHistory, Long> {

    @Query("""
            SELECT new com.stockflow.hq.domain.report.dto.StoreSaleRawDto(
                s.id, s.name, po.id, sh.createdAt, sh.quantity, p.price
            )
            FROM StockHistory sh
            JOIN sh.store s
            JOIN sh.productOption po
            JOIN po.product p
            WHERE sh.type = com.stockflow.hq.domain.stockhistory.entity.StockHistoryType.OUT
              AND sh.reason = com.stockflow.hq.domain.stockhistory.entity.StockHistoryReason.SALE
              AND sh.createdAt >= :start AND sh.createdAt < :end
            """)
    List<StoreSaleRawDto> findRawStoreSales(@Param("start") LocalDateTime start,
                                            @Param("end") LocalDateTime end);

    @Query("""
            SELECT new com.stockflow.hq.domain.report.dto.ProductSalesAggregateDto(
                p.id, p.name, SUM(sh.quantity), SUM(sh.quantity * p.price)
            )
            FROM StockHistory sh
            JOIN sh.productOption po
            JOIN po.product p
            WHERE sh.type = com.stockflow.hq.domain.stockhistory.entity.StockHistoryType.OUT
              AND sh.reason = com.stockflow.hq.domain.stockhistory.entity.StockHistoryReason.SALE
              AND sh.createdAt >= :start AND sh.createdAt < :end
            GROUP BY p.id, p.name
            """)
    List<ProductSalesAggregateDto> findProductSalesAggregate(@Param("start") LocalDateTime start,
                                                             @Param("end") LocalDateTime end);
}
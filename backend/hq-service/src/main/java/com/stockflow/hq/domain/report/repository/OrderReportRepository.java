package com.stockflow.hq.domain.report.repository;

import com.stockflow.hq.domain.order.entity.OrderItem;
import com.stockflow.hq.domain.report.dto.StoreOrderVolumeDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderReportRepository extends JpaRepository<OrderItem, Long> {

    // RECEIVED(입고완료)된 발주만 집계 — 요청/승인만 되고 실제 입고 안 된 건 발주 효율 계산에서 제외
    @Query("""
            SELECT new com.stockflow.hq.domain.report.dto.StoreOrderVolumeDto(
                s.id, s.name, SUM(oi.quantity)
            )
            FROM OrderItem oi
            JOIN oi.order o
            JOIN o.store s
            WHERE o.status = com.stockflow.hq.domain.order.entity.OrderStatus.RECEIVED
              AND o.createdAt >= :start AND o.createdAt < :end
            GROUP BY s.id, s.name
            """)
    List<StoreOrderVolumeDto> findStoreOrderVolume(@Param("start") LocalDateTime start,
                                                   @Param("end") LocalDateTime end);
}
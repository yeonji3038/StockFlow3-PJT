package com.stockflow.hq.domain.anomaly.repository;

import com.stockflow.hq.domain.anomaly.entity.AnomalyAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnomalyAlertRepository extends JpaRepository<AnomalyAlert, Long> {
    List<AnomalyAlert> findAllByOrderByCreatedAtDesc();
    List<AnomalyAlert> findByResolvedFalseOrderByCreatedAtDesc();
    long countByResolvedFalse();
}
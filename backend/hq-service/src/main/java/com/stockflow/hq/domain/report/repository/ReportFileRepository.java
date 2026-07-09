package com.stockflow.hq.domain.report.repository;

import com.stockflow.hq.domain.report.entity.ReportFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportFileRepository extends JpaRepository<ReportFile, Long> {

    // 최신 리포트가 먼저 보이도록 기간 역순 정렬 (목록 화면용)
    List<ReportFile> findAllByOrderByPeriodStartDesc();
}
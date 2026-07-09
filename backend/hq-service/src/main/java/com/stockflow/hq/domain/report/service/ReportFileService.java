package com.stockflow.hq.domain.report.service;

import com.stockflow.hq.domain.report.dto.ReportFileSummaryDto;
import com.stockflow.hq.domain.report.dto.WeeklyReportDto;
import com.stockflow.hq.domain.report.entity.ReportFile;
import com.stockflow.hq.domain.report.repository.ReportFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportFileService {

    private static final DateTimeFormatter FILE_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final ReportFileRepository reportFileRepository;

    public ReportFile save(WeeklyReportDto report, byte[] pdfBytes) {
        String fileName = "weekly-report-" + report.periodStart().format(FILE_DATE_FMT) + ".pdf";
        ReportFile file = ReportFile.builder()
                .periodStart(report.periodStart())
                .periodEnd(report.periodEnd())
                .fileName(fileName)
                .pdfData(pdfBytes)
                .build();
        return reportFileRepository.save(file);
    }

    public List<ReportFileSummaryDto> findAll() {
        return reportFileRepository.findAllByOrderByPeriodStartDesc().stream()
                .map(f -> new ReportFileSummaryDto(f.getId(), f.getPeriodStart(), f.getPeriodEnd(),
                        f.getFileName(), f.getCreatedAt()))
                .toList();
    }

    public ReportFile getById(Long id) {
        return reportFileRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("리포트 파일을 찾을 수 없습니다. id=" + id));
    }
}
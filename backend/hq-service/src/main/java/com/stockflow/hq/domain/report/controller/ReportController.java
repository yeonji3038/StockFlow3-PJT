package com.stockflow.hq.domain.report.controller;

import com.stockflow.hq.domain.report.batch.WeeklyReportScheduler;
import com.stockflow.hq.domain.report.dto.ReportFileSummaryDto;
import com.stockflow.hq.domain.report.entity.ReportFile;
import com.stockflow.hq.domain.report.service.ReportFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

/**
 * 매주 cron(기본 월요일 08:00)까지 기다리지 않고 즉시 리포트 Job을 실행하기 위한 트리거 +
 * 이미 생성된 리포트 목록 조회 / PDF 다운로드.
 */
@RestController
@RequestMapping("/api/reports/weekly")
@RequiredArgsConstructor
public class ReportController {

    private final WeeklyReportScheduler scheduler;
    private final ReportFileService reportFileService;

    // periodStart 미지정 시 지난주 월요일 기준으로 실행
    @PostMapping("/trigger")
    public ResponseEntity<String> triggerWeeklyReport(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodStart) {

        LocalDate start = periodStart != null
                ? periodStart
                : LocalDate.now().minusWeeks(1).with(DayOfWeek.MONDAY);

        scheduler.launch(start);
        return ResponseEntity.accepted()
                .body("주간 리포트 Job 실행 요청됨 (periodStart=" + start + "). 메일 발송까지 잠시 기다려주세요.");
    }

    // 지금까지 생성된 리포트 목록 (최신순) — 사이트에서 "지난 리포트" 화면에 사용
    @GetMapping
    public ResponseEntity<List<ReportFileSummaryDto>> getReportList() {
        return ResponseEntity.ok(reportFileService.findAll());
    }

    // 특정 리포트 PDF 다운로드
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadReport(@PathVariable Long id) {
        ReportFile file = reportFileService.getById(id);

        String encodedFileName = ContentDisposition.attachment()
                .filename(file.getFileName(), StandardCharsets.UTF_8)
                .build()
                .toString();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, encodedFileName)
                .body(file.getPdfData());
    }
}
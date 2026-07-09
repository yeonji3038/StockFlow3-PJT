package com.stockflow.hq.domain.report.batch;

import com.stockflow.hq.domain.report.dto.WeeklyReportDto;
import com.stockflow.hq.domain.report.service.ReportAggregationService;
import com.stockflow.hq.domain.report.service.ReportFileService;
import com.stockflow.hq.domain.report.service.ReportMailService;
import com.stockflow.hq.domain.report.service.ReportPdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDate;

/**
 * 매주 1회(스케줄러 트리거) 실행되는 "집계 → PDF 생성 → DB 저장 → 메일 발송" Job.
 * 3단계 이상이 서로 강하게 결합돼 있고(전부 성공 or 재시도) 대량 데이터를 chunk로 나눠 처리할 필요가 없어서
 * Chunk 방식 대신 단일 Tasklet으로 구성했다.
 */
@Configuration
@RequiredArgsConstructor
public class WeeklyReportJobConfig {

    public static final String JOB_NAME = "weeklyReportJob";
    public static final String PERIOD_START_PARAM = "periodStart";

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final ReportAggregationService aggregationService;
    private final ReportPdfService pdfService;
    private final ReportFileService reportFileService;
    private final ReportMailService mailService;

    @Bean
    public Job weeklyReportJob() {
        return new JobBuilder(JOB_NAME, jobRepository)
                .start(weeklyReportStep())
                .build();
    }

    @Bean
    public Step weeklyReportStep() {
        return new StepBuilder("weeklyReportStep", jobRepository)
                .tasklet(weeklyReportTasklet(), transactionManager)
                .build();
    }

    @Bean
    public Tasklet weeklyReportTasklet() {
        return (contribution, chunkContext) -> {
            String periodStartStr = chunkContext.getStepContext()
                    .getStepExecution()
                    .getJobParameters()
                    .getString(PERIOD_START_PARAM);

            LocalDate periodStart = LocalDate.parse(periodStartStr);
            LocalDate periodEnd = periodStart.plusDays(7);

            WeeklyReportDto report = aggregationService.generateWeeklyReport(periodStart, periodEnd);
            byte[] pdf = pdfService.renderPdf(report);
            reportFileService.save(report, pdf);   // 사이트 다운로드용 저장 (메일보다 먼저 — 메일 실패해도 다운로드는 가능해야 함)
            mailService.sendWeeklyReport(report, pdf);

            return RepeatStatus.FINISHED;
        };
    }
}
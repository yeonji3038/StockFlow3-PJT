package com.stockflow.hq.domain.report.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class WeeklyReportScheduler {

    private final JobLauncher jobLauncher;
    private final Job weeklyReportJob;

    // report.schedule.cron 기본값: "0 0 8 * * MON" (매주 월요일 08:00), application.yml에서 설정
    @Scheduled(cron = "${report.schedule.cron}")
    public void runWeeklyReportJob() {
        LocalDate lastMonday = LocalDate.now().minusWeeks(1).with(DayOfWeek.MONDAY);
        launch(lastMonday);
    }

    /**
     * triggeredAt을 JobParameter에 함께 넣어 매 실행을 유니크하게 만든다.
     * 이게 없으면 같은 periodStart로 다시 실행 시 Spring Batch가
     * "이미 완료된 JobInstance"로 판단해서 재실행을 거부한다 (재발송 테스트를 위해 일부러 열어둠).
     */
    public void launch(LocalDate periodStart) {
        try {
            JobParameters params = new JobParametersBuilder()
                    .addString(WeeklyReportJobConfig.PERIOD_START_PARAM, periodStart.toString())
                    .addLong("triggeredAt", System.currentTimeMillis())
                    .toJobParameters();

            jobLauncher.run(weeklyReportJob, params);
        } catch (Exception e) {
            log.error("주간 리포트 Job 실행 실패 (periodStart={})", periodStart, e);
        }
    }
}
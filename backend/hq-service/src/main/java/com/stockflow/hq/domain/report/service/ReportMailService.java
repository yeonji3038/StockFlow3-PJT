package com.stockflow.hq.domain.report.service;

import com.stockflow.hq.domain.report.dto.WeeklyReportDto;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class ReportMailService {

    private static final DateTimeFormatter FILE_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final JavaMailSender mailSender;

    // application.yml의 report.mail.to (REPORT_MAIL_TO 환경변수) 주입
    @Value("${report.mail.to}")
    private String recipientTo;

    public void sendWeeklyReport(WeeklyReportDto report, byte[] pdfBytes) {
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(recipientTo.split(","));  // 콤마로 여러 명 지정 가능
            helper.setSubject("[StockFlow3] 주간 재고/판매 리포트 ("
                    + report.periodStart().format(FILE_DATE_FMT) + "~"
                    + report.periodEnd().minusDays(1).format(FILE_DATE_FMT) + ")");
            helper.setText(buildBody(report), false);

            String fileName = "weekly-report-" + report.periodStart().format(FILE_DATE_FMT) + ".pdf";
            helper.addAttachment(fileName, new ByteArrayResource(pdfBytes));

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new IllegalStateException("주간 리포트 메일 발송 실패", e);
        }
    }

    private String buildBody(WeeklyReportDto report) {
        return "안녕하세요,\n\n"
                + report.periodStart() + " ~ " + report.periodEnd().minusDays(1)
                + " 기간의 주간 재고/판매 리포트가 자동 생성되었습니다.\n"
                + "첨부된 PDF를 확인해주세요.\n\n"
                + "본 메일은 StockFlow3 Spring Batch에 의해 자동 발송되었습니다.";
    }
}
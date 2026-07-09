package com.stockflow.hq.domain.report.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 생성된 주간 리포트 PDF를 DB에 보관한다.
 * 메일 발송은 "알림", 여기 저장된 파일은 "언제든 다시 다운로드할 수 있는 보관소" 역할.
 *
 * 참고: 지금 규모(포트폴리오, 파일 몇 MB 수준)엔 bytea로 충분하지만, 실제 트래픽이
 * 커지면 DB에 바이너리 넣는 대신 S3 등 객체 스토리지 + URL만 저장하는 방식으로 바꿔야 한다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
@Table(name = "report_files")
public class ReportFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate periodStart;
    private LocalDate periodEnd;
    private String fileName;

    @Column(columnDefinition = "bytea")
    private byte[] pdfData;

    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
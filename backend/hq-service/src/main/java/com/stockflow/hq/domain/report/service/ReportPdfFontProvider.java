package com.stockflow.hq.domain.report.service;

import com.lowagie.text.Font;
import com.lowagie.text.pdf.BaseFont;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

/**
 * OpenPDF 기본 폰트(Helvetica 등)는 한글 글리프가 없어서 그대로 쓰면 빈칸/깨짐이 발생한다.
 * 나눔고딕(OFL 라이선스, resources/fonts에 포함)을 IDENTITY_H로 임베딩해서 재사용 가능한
 * Font 인스턴스들을 제공한다.
 */
@Component
public class ReportPdfFontProvider {

    private final BaseFont baseFont;

    public ReportPdfFontProvider() {
        try (InputStream is = getClass().getResourceAsStream("/fonts/NanumGothic-Regular.ttf")) {
            if (is == null) {
                throw new IllegalStateException("resources/fonts/NanumGothic-Regular.ttf 를 찾을 수 없습니다");
            }
            byte[] fontBytes = is.readAllBytes();
            this.baseFont = BaseFont.createFont("NanumGothic.ttf", BaseFont.IDENTITY_H,
                    BaseFont.EMBEDDED, true, fontBytes, null);
        } catch (IOException e) {
            throw new IllegalStateException("한글 폰트 로딩 실패", e);
        }
    }

    public Font title() {
        return new Font(baseFont, 18, Font.BOLD);
    }

    public Font sectionHeader() {
        return new Font(baseFont, 13, Font.BOLD);
    }

    public Font tableHeader() {
        return new Font(baseFont, 10, Font.BOLD);
    }

    public Font body() {
        return new Font(baseFont, 10, Font.NORMAL);
    }

    public Font caption() {
        return new Font(baseFont, 9, Font.NORMAL, java.awt.Color.GRAY);
    }
}
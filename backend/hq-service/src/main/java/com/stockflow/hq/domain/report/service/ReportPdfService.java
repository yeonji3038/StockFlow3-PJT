package com.stockflow.hq.domain.report.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.stockflow.hq.domain.report.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ReportPdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private final ReportPdfFontProvider fonts;
    private final ReportChartService chartService;

    public byte[] renderPdf(WeeklyReportDto report) {
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            addHeader(document, report);
            addChart(document, report);
            addTopProductsSection(document, "인기 상품 Top5 (판매수량 기준)", report.topProductsByQuantity(), true);
            addTopProductsSection(document, "인기 상품 Top5 (매출액 기준)", report.topProductsByRevenue(), false);
            addOrderEfficiencySection(document, report.orderEfficiency());

            document.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("PDF 생성 실패", e);
        }

        return out.toByteArray();
    }

    private void addHeader(Document document, WeeklyReportDto report) throws DocumentException {
        Paragraph title = new Paragraph("StockFlow3 주간 재고/판매 리포트", fonts.title());
        title.setSpacingAfter(4f);
        document.add(title);

        String period = report.periodStart().format(DATE_FMT) + " ~ "
                + report.periodEnd().minusDays(1).format(DATE_FMT);
        Paragraph subtitle = new Paragraph("대상 기간: " + period, fonts.caption());
        subtitle.setSpacingAfter(16f);
        document.add(subtitle);
    }

    private void addChart(Document document, WeeklyReportDto report) throws DocumentException {
        if (report.salesTrend().isEmpty()) {
            document.add(new Paragraph("해당 기간 판매 데이터가 없습니다.", fonts.body()));
            return;
        }
        byte[] chartPng = chartService.renderDailySalesTrendChart(report.salesTrend());
        try {
            Image chartImage = Image.getInstance(chartPng);
            chartImage.scaleToFit(520, 300);
            chartImage.setSpacingAfter(16f);
            document.add(chartImage);
        } catch (Exception e) {
            throw new DocumentException("차트 이미지 삽입 실패: " + e.getMessage());
        }
    }

    private void addTopProductsSection(Document document, String heading,
                                       List<ProductSalesAggregateDto> products,
                                       boolean highlightQuantity) throws DocumentException {
        document.add(sectionHeading(heading));

        PdfPTable table = new PdfPTable(new float[]{5f, 2f, 2f});
        table.setWidthPercentage(100);
        table.setSpacingAfter(16f);

        addHeaderRow(table, "상품명", "판매수량", "매출액");

        for (ProductSalesAggregateDto p : products) {
            table.addCell(bodyCell(p.productName()));
            table.addCell(bodyCell(formatNumber(p.totalQuantity())));
            table.addCell(bodyCell(formatCurrency(p.totalRevenue())));
        }
        if (products.isEmpty()) {
            PdfPCell empty = bodyCell("데이터 없음");
            empty.setColspan(3);
            table.addCell(empty);
        }

        document.add(table);
    }

    private void addOrderEfficiencySection(Document document,
                                           List<StoreOrderEfficiencyDto> efficiency) throws DocumentException {
        document.add(sectionHeading("매장별 발주 효율 (판매수량 / 발주수량, AI 추천 발주량 비교)"));

        PdfPTable table = new PdfPTable(new float[]{3f, 2f, 2f, 2f, 2f});
        table.setWidthPercentage(100);
        table.setSpacingAfter(12f);

        addHeaderRow(table, "매장명", "발주수량(Before)", "AI 추천(After)", "판매수량", "충족률");

        for (StoreOrderEfficiencyDto e : efficiency) {
            table.addCell(bodyCell(e.storeName()));
            table.addCell(bodyCell(formatNumber(e.orderedQuantity())));
            table.addCell(bodyCell(formatAiRecommended(e.aiRecommendedQuantity())));
            table.addCell(bodyCell(formatNumber(e.soldQuantity())));
            table.addCell(bodyCell(formatRate(e.fulfillmentRate())));
        }
        if (efficiency.isEmpty()) {
            PdfPCell empty = bodyCell("데이터 없음");
            empty.setColspan(5);
            table.addCell(empty);
        }

        document.add(table);
        document.add(new Paragraph(
                "* 충족률 = 판매수량 / 발주수량. 100%에 가까울수록 발주-판매 균형, 낮을수록 과발주(재고 적체) 신호. "
                        + "AI 추천 발주량은 LightGBM 수요예측 모델 기준(베이스라인 대비 MAE 32% 개선). "
                        + "AI 학습 데이터 범위 밖 매장/상품은 'N/A'로 표시됨.",
                fonts.caption()));
    }

    private Paragraph sectionHeading(String text) {
        Paragraph p = new Paragraph(text, fonts.sectionHeader());
        p.setSpacingBefore(8f);
        p.setSpacingAfter(6f);
        return p;
    }

    private void addHeaderRow(PdfPTable table, String... columns) {
        for (String col : columns) {
            PdfPCell cell = new PdfPCell(new Phrase(col, fonts.tableHeader()));
            cell.setBackgroundColor(new java.awt.Color(230, 230, 230));
            cell.setPadding(6f);
            table.addCell(cell);
        }
    }

    private PdfPCell bodyCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, fonts.body()));
        cell.setPadding(5f);
        return cell;
    }

    private String formatNumber(Long value) {
        return String.format(Locale.KOREA, "%,d", value == null ? 0 : value);
    }

    private String formatAiRecommended(Long value) {
        return value == null ? "N/A" : String.format(Locale.KOREA, "%,d", value);
    }

    private String formatCurrency(Long value) {
        return String.format(Locale.KOREA, "%,d원", value == null ? 0 : value);
    }

    private String formatRate(Double rate) {
        if (rate == null) {
            return "N/A (발주 없음)";
        }
        return String.format(Locale.KOREA, "%.1f%%", rate * 100);
    }
}
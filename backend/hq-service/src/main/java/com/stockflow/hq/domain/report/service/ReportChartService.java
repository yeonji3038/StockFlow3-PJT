package com.stockflow.hq.domain.report.service;

import com.stockflow.hq.domain.report.dto.DailyStoreSalesDto;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.axis.CategoryAxis;
import org.jfree.chart.axis.ValueAxis;
import org.jfree.chart.plot.CategoryPlot;
import org.jfree.chart.plot.PlotOrientation;
import org.jfree.chart.title.TextTitle;
import org.jfree.data.category.DefaultCategoryDataset;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import javax.imageio.ImageIO;

/**
 * 매장별 일별 매출 추이를 선그래프(PNG)로 렌더링해서 PDF에 삽입할 수 있는 바이트 배열로 반환한다.
 *
 * 주의: JFreeChart는 AWT로 직접 텍스트를 렌더링하기 때문에, PDF 폰트(ReportPdfFontProvider)와는
 * 별도로 java.awt.Font를 여기서 한 번 더 로드해서 제목/축/범례에 적용해야 한다. 그냥 두면
 * 컨테이너 환경(한글 폰트 미설치)에서는 한글이 네모(tofu box)로 깨져서 나온다.
 */
@Service
public class ReportChartService {

    private static final DateTimeFormatter DATE_LABEL = DateTimeFormatter.ofPattern("MM/dd");
    private static final int CHART_WIDTH = 700;
    private static final int CHART_HEIGHT = 380;

    private final java.awt.Font chartFont;

    public ReportChartService() {
        try (InputStream is = getClass().getResourceAsStream("/fonts/NanumGothic-Regular.ttf")) {
            if (is == null) {
                throw new IllegalStateException("resources/fonts/NanumGothic-Regular.ttf 를 찾을 수 없습니다");
            }
            this.chartFont = java.awt.Font.createFont(java.awt.Font.TRUETYPE_FONT, is)
                    .deriveFont(java.awt.Font.PLAIN, 12f);
        } catch (IOException | java.awt.FontFormatException e) {
            throw new IllegalStateException("차트용 한글 폰트 로딩 실패", e);
        }
    }

    public byte[] renderDailySalesTrendChart(java.util.List<DailyStoreSalesDto> salesTrend) {
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();

        salesTrend.stream()
                .sorted(Comparator.comparing(DailyStoreSalesDto::salesDate))
                .forEach(row -> dataset.addValue(
                        row.revenue(),
                        row.storeName(),
                        row.salesDate().format(DATE_LABEL)
                ));

        JFreeChart chart = ChartFactory.createLineChart(
                "매장별 일별 매출 추이",
                "날짜",
                "매출(원)",
                dataset,
                PlotOrientation.VERTICAL,
                true,
                false,
                false
        );

        applyKoreanFont(chart);

        BufferedImage image = chart.createBufferedImage(CHART_WIDTH, CHART_HEIGHT);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("차트 이미지 생성 실패", e);
        }
    }

    private void applyKoreanFont(JFreeChart chart) {
        TextTitle title = chart.getTitle();
        if (title != null) {
            title.setFont(chartFont.deriveFont(java.awt.Font.BOLD, 16f));
        }
        if (chart.getLegend() != null) {
            chart.getLegend().setItemFont(chartFont);
        }

        CategoryPlot plot = chart.getCategoryPlot();
        CategoryAxis domainAxis = plot.getDomainAxis();
        domainAxis.setLabelFont(chartFont);
        domainAxis.setTickLabelFont(chartFont);

        ValueAxis rangeAxis = plot.getRangeAxis();
        rangeAxis.setLabelFont(chartFont);
        rangeAxis.setTickLabelFont(chartFont);
    }
}
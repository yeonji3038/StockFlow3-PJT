package com.stockflow.common.kafka.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 재고 변동 이벤트 (확장 버전)
 *
 * 변경 사항:
 * 1. storeId 추가 — 어느 매장에서 발생한 재고 변동인지 (이상탐지 AI 호출 시 필수)
 * 2. productOptionId 추가 — ProductOption(SKU) 단위로 관리되므로 productId가 아니라
 *    productOptionId가 있어야 정확한 수요예측/이상탐지 가능
 * 3. reason 추가 — SALE/DAMAGE/RETURN 등 이유에 따라 이상탐지 판단이 달라짐
 *    (예: reason=DAMAGE면 이미 이상한 상황이라 이상탐지를 더 민감하게 적용)
 *
 * 하위 호환:
 * - 기존 productId, productName, previousStock, changedAmount, currentStock, changeType, timestamp는 그대로 유지
 * - 새 필드(storeId, productOptionId, reason)는 nullable이므로 기존 Producer 코드가
 *   세팅하지 않아도 컴파일 에러 없음 (단, 이상탐지 AI 호출 시 null 체크 필요)
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockChangeEvent {

    // ── 기존 필드 (변경 없음) ─────────────────────────────────
    private Long productId;       // 상품 ID (Product 단위)
    private String productName;   // 상품 이름
    private int previousStock;    // 변동 전 재고량
    private int changedAmount;    // 변동된 수량 (입고 +, 출고 -)
    private int currentStock;     // 변동 후 현재 재고량
    private String changeType;    // "INCREASE"(입고) | "DECREASE"(출고)
    private LocalDateTime timestamp;

    // ── 새로 추가된 필드 (이상탐지/수요예측 AI 연동용) ────────────
    private Long storeId;            // 어느 매장에서 발생한 변동인지
    private Long productOptionId;    // ProductOption(SKU) 단위 ID
    private String reason;           // SALE / DAMAGE / RETURN / ALLOCATION / ORDER 등
    // StockHistory.reason enum과 동일한 값
}

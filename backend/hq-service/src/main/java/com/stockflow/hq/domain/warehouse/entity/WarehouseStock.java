package com.stockflow.hq.domain.warehouse.entity;

import com.stockflow.hq.domain.product.entity.ProductOption;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "warehouse_stocks")
public class WarehouseStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_option_id")
    private ProductOption productOption;

    private int quantity; // 실물 재고 (창고에 실제로 있는 수량)

    @Column(name = "reserved_quantity")
    @Builder.Default
    private int reservedQuantity = 0; // 발주 승인은 됐지만 아직 출고 안 된 예약 수량

    public void updateQuantity(int quantity) {
        this.quantity = quantity;
    }

    // 판매/발주 가능한 실제 가용재고 = 실물재고 - 예약재고
    public int getAvailableQuantity() {
        return quantity - reservedQuantity;
    }

    // 발주 승인 시 호출: 실물재고는 그대로 두고 예약재고만 늘림
    public void reserve(int amount) {
        this.reservedQuantity += amount;
    }

    // 발주 출고 완료 시 호출: 실물재고 차감 + 예약 해제를 동시에 처리
    public void confirmShipment(int amount) {
        this.quantity -= amount;
        this.reservedQuantity -= amount;
    }

    // 발주 반려 시 호출: 예약만 취소하고 실물재고는 안 건드림
    public void releaseReservation(int amount) {
        this.reservedQuantity -= amount;
    }
}
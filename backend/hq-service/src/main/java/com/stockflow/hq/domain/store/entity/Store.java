package com.stockflow.hq.domain.store.entity;

import com.stockflow.hq.domain.warehouse.entity.Warehouse;
import com.stockflow.hq.global.common.BaseTimeEntity;
import com.stockflow.hq.domain.brand.entity.Brand;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "stores")
public class Store extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    // 발주 승인 시 이 창고에서 자동으로 재고가 차감/출고됨
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String location;

    @Enumerated(EnumType.STRING)
    private StoreType storeType;

    private String phone;

    // 매장 관리자 가입 시 사용하는 매장 식별 코드 (예: DP-A3F9, OT-7K2M)
    @Column(name = "store_code", nullable = false, unique = true)
    private String storeCode;

    public void update(String name, String location, StoreType storeType, String phone, Brand brand, Warehouse warehouse) {
        this.name = name;
        this.location = location;
        this.storeType = storeType;
        this.phone = phone;
        this.brand = brand;
        this.warehouse = warehouse;
    }
}
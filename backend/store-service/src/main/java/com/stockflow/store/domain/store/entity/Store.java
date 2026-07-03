package com.stockflow.store.domain.store.entity;

import com.stockflow.store.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import com.stockflow.store.domain.brand.entity.Brand;

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

    public void update(String name, String location, StoreType storeType, String phone, Brand brand) {
        this.name = name;
        this.location = location;
        this.storeType = storeType;
        this.phone = phone;
        this.brand = brand;
    }
}

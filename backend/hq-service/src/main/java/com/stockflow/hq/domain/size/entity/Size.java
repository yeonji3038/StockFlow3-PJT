package com.stockflow.hq.domain.size.entity;

import com.stockflow.hq.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "sizes")
public class Size extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "sku_code", nullable = false)
    private String skuCode;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public void update(String name, String skuCode, Integer sortOrder) {
        this.name = name;
        this.skuCode = skuCode;
        this.sortOrder = sortOrder;
    }
}
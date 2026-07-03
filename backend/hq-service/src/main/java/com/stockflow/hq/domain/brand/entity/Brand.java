package com.stockflow.hq.domain.brand.entity;

import com.stockflow.hq.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "brands")
public class Brand extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "code", nullable = false, unique = true)
    private String code; // SKU 조합용 브랜드 코드: LEE, COV 등

    private String description;

    public void update(String name, String code, String description) {
        this.name = name;
        this.code = code;
        this.description = description;
    }
}
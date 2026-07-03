package com.stockflow.hq.domain.product.entity;

import com.stockflow.hq.domain.size.entity.Size;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "product_options")
public class ProductOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    private String color; // 표시용 색상명: 다크 네이비

    @Column(name = "color_code")
    private String colorCode; // SKU 조합용 색상코드: NA

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "size_id")
    private Size size;

    @Column(unique = true)
    private String skuCode; // 자동 생성됨 (상품코드 + 색상코드 + 사이즈코드)

    @Enumerated(EnumType.STRING)
    private ProductOptionStatus status;

    public void update(String color, String colorCode, Size size, String skuCode, ProductOptionStatus status) {
        this.color = color;
        this.colorCode = colorCode;
        this.size = size;
        this.skuCode = skuCode;
        this.status = status;
    }
}
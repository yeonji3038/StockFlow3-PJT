package com.stockflow.hq.domain.product.dto;

import com.stockflow.hq.domain.product.entity.ProductOption;
import com.stockflow.hq.domain.product.entity.ProductOptionStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ProductOptionResponseDto {

    private Long id;
    private Long productId;
    private String productName;
    private String color;
    private String colorCode;
    private Long sizeId;
    private String sizeName;
    private String skuCode;
    private ProductOptionStatus status;

    public static ProductOptionResponseDto from(ProductOption productOption) {
        return ProductOptionResponseDto.builder()
                .id(productOption.getId())
                .productId(productOption.getProduct().getId())
                .productName(productOption.getProduct().getName())
                .color(productOption.getColor())
                .colorCode(productOption.getColorCode())
                .sizeId(productOption.getSize().getId())
                .sizeName(productOption.getSize().getName())
                .skuCode(productOption.getSkuCode())
                .status(productOption.getStatus())
                .build();
    }
}
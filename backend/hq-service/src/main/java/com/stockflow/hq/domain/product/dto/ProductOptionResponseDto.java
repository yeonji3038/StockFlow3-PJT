package com.stockflow.hq.domain.product.dto;

import com.stockflow.hq.domain.product.entity.ProductOption;
import com.stockflow.hq.domain.product.entity.ProductOptionStatus;
import com.stockflow.hq.domain.product.entity.ProductSize;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ProductOptionResponseDto {

    private Long id;
    private Long productId;
    private String productName;
    private String color;
    private ProductSize size;
    private String skuCode;
    private ProductOptionStatus status;

    public static ProductOptionResponseDto from(ProductOption productOption) {
        return ProductOptionResponseDto.builder()
                .id(productOption.getId())
                .productId(productOption.getProduct().getId())
                .productName(productOption.getProduct().getName())
                .color(productOption.getColor())
                .size(productOption.getSize())
                .skuCode(productOption.getSkuCode())
                .status(productOption.getStatus())
                .build();
    }
}
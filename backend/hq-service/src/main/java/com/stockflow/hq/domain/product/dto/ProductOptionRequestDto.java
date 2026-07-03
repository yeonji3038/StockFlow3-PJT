package com.stockflow.hq.domain.product.dto;

import com.stockflow.hq.domain.product.entity.ProductOptionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ProductOptionRequestDto {

    @NotBlank(message = "색상은 필수입니다.")
    private String color;

    @NotBlank(message = "색상 코드는 필수입니다.")
    private String colorCode;

    @NotNull(message = "사이즈는 필수입니다.")
    private Long sizeId;

    @NotNull(message = "옵션 상태는 필수입니다.")
    private ProductOptionStatus status;
}
package com.stockflow.hq.domain.size.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SizeRequestDto {

    @NotBlank(message = "사이즈명은 필수입니다.")
    private String name;

    @NotBlank(message = "SKU 코드는 필수입니다.")
    private String skuCode;

    private Integer sortOrder;
}
package com.stockflow.hq.domain.brand.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class BrandRequestDto {

    @NotBlank(message = "브랜드명은 필수입니다.")
    private String name;

    @NotBlank(message = "브랜드 코드는 필수입니다.")
    private String code;

    private String description;
}
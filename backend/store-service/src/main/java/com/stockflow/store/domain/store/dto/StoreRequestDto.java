package com.stockflow.store.domain.store.dto;

import com.stockflow.store.domain.store.entity.StoreType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class StoreRequestDto {

    @NotNull(message = "브랜드는 필수입니다.")
    private Long brandId;

    @NotBlank(message = "매장명은 필수입니다.")
    private String name;


    @NotBlank(message = "매장 위치는 필수입니다.")
    private String location;

    @NotNull(message = "매장 유형은 필수입니다.")
    private StoreType storeType;

    private String phone;
}
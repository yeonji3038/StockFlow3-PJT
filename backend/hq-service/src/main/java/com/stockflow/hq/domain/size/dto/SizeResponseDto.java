package com.stockflow.hq.domain.size.dto;

import com.stockflow.hq.domain.size.entity.Size;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SizeResponseDto {

    private Long id;
    private String name;
    private String skuCode;
    private Integer sortOrder;

    public static SizeResponseDto from(Size size) {
        return SizeResponseDto.builder()
                .id(size.getId())
                .name(size.getName())
                .skuCode(size.getSkuCode())
                .sortOrder(size.getSortOrder())
                .build();
    }
}
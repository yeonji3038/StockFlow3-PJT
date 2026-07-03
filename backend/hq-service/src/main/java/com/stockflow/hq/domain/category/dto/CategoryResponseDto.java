package com.stockflow.hq.domain.category.dto;

import com.stockflow.hq.domain.category.entity.Category;
import lombok.Builder;
import lombok.Getter;
import com.fasterxml.jackson.annotation.JsonInclude;


import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_EMPTY) // 빈 리스트면 응답에서 제외
public class CategoryResponseDto {

    private Long id;
    private String name;
    private String code;
    private List<CategoryResponseDto> children;

    public static CategoryResponseDto from(Category category) {
        return CategoryResponseDto.builder()
                .id(category.getId())
                .name(category.getName())
                .code(category.getCode())
                .children(new ArrayList<>())
                .build();
    }
}
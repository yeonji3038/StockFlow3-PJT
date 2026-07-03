package com.stockflow.hq.domain.size.service;

import com.stockflow.hq.domain.size.dto.SizeRequestDto;
import com.stockflow.hq.domain.size.dto.SizeResponseDto;
import com.stockflow.hq.domain.size.entity.Size;
import com.stockflow.hq.domain.size.repository.SizeRepository;
import com.stockflow.hq.global.exception.BusinessException;
import com.stockflow.hq.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SizeService {

    private final SizeRepository sizeRepository;

    @Transactional
    public SizeResponseDto create(SizeRequestDto request) {
        Size size = Size.builder()
                .name(request.getName())
                .skuCode(request.getSkuCode())
                .sortOrder(request.getSortOrder())
                .build();
        return SizeResponseDto.from(sizeRepository.save(size));
    }

    public List<SizeResponseDto> findAll() {
        return sizeRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(SizeResponseDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public SizeResponseDto update(Long id, SizeRequestDto request) {
        Size size = sizeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.SIZE_NOT_FOUND));
        size.update(request.getName(), request.getSkuCode(), request.getSortOrder());
        return SizeResponseDto.from(size);
    }

    @Transactional
    public void delete(Long id) {
        if (!sizeRepository.existsById(id)) {
            throw new BusinessException(ErrorCode.SIZE_NOT_FOUND);
        }
        sizeRepository.deleteById(id);
    }
}
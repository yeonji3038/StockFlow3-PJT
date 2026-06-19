package com.stockflow.store.domain.store.service;

import com.stockflow.store.domain.store.dto.StoreRequestDto;
import com.stockflow.store.domain.store.dto.StoreResponseDto;
import com.stockflow.store.domain.store.entity.Store;
import com.stockflow.store.domain.store.repository.StoreRepository;
import com.stockflow.store.global.exception.BusinessException;
import com.stockflow.store.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreService {

    private final StoreRepository storeRepository;

    // 매장 생성
    @Transactional
    public StoreResponseDto create(StoreRequestDto request) {
        Store store = Store.builder()
                .name(request.getName())
                .location(request.getLocation())
                .storeType(request.getStoreType())
                .phone(request.getPhone())
                .build();
        return StoreResponseDto.from(storeRepository.save(store));
    }

    // 매장 전체 조회
    public List<StoreResponseDto> findAll() {
        return storeRepository.findAll().stream()
                .map(StoreResponseDto::from)
                .collect(Collectors.toList());
    }

    // 매장 단건 조회
    public StoreResponseDto findById(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.STORE_NOT_FOUND));
        return StoreResponseDto.from(store);
    }

    // 매장 수정
    @Transactional
    public StoreResponseDto update(Long id, StoreRequestDto request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.STORE_NOT_FOUND));
        store.update(request.getName(), request.getLocation(), request.getStoreType(), request.getPhone());
        return StoreResponseDto.from(store);
    }

    // 매장 삭제
    @Transactional
    public void delete(Long id) {
        if (!storeRepository.existsById(id)) {
            throw new BusinessException(ErrorCode.STORE_NOT_FOUND);
        }
        storeRepository.deleteById(id);
    }
}
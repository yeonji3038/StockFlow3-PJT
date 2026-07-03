package com.stockflow.store.domain.store.service;

import com.stockflow.store.domain.brand.entity.Brand;
import com.stockflow.store.domain.brand.repository.BrandRepository;
import com.stockflow.store.domain.store.dto.StoreRequestDto;
import com.stockflow.store.domain.store.dto.StoreResponseDto;
import com.stockflow.store.domain.store.entity.Store;
import com.stockflow.store.domain.store.entity.StoreType;
import com.stockflow.store.domain.store.repository.StoreRepository;
import com.stockflow.store.global.exception.BusinessException;
import com.stockflow.store.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreService {

    private final StoreRepository storeRepository;
    private final BrandRepository brandRepository;

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동되는 0/O, 1/I 제외
    private static final SecureRandom RANDOM = new SecureRandom();

    // 매장 생성
    @Transactional
    public StoreResponseDto create(StoreRequestDto request) {
        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new BusinessException(ErrorCode.BRAND_NOT_FOUND));

        Store store = Store.builder()
                .brand(brand)
                .name(request.getName())
                .location(request.getLocation())
                .storeType(request.getStoreType())
                .phone(request.getPhone())
                .storeCode(generateUniqueStoreCode(request.getStoreType()))
                .build();
        return StoreResponseDto.from(storeRepository.save(store));
    }

    // 매장 유형별 접두사 + 랜덤 4자리로 매장 코드 생성, 중복 시 재생성
    private String generateUniqueStoreCode(StoreType storeType) {
        String prefix = switch (storeType) {
            case HQ -> "HQ";
            case DEPARTMENT -> "DP";
            case OUTLET -> "OT";
        };

        String code;
        int attempts = 0;
        do {
            code = prefix + "-" + randomSuffix(8);
            attempts++;
            if (attempts > 20) {
                throw new IllegalStateException("매장 코드 생성에 반복적으로 실패했습니다.");
            }
        } while (storeRepository.existsByStoreCode(code));

        return code;
    }

    private String randomSuffix(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
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

    // 매장 코드로 조회 (회원가입 화면 미리보기, 본인 코드 검증용)
    public StoreResponseDto findByStoreCode(String storeCode) {
        Store store = storeRepository.findByStoreCode(storeCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.STORE_NOT_FOUND));
        return StoreResponseDto.from(store);
    }

    // 매장 코드로 엔티티 조회 (UserService의 회원가입 로직에서 내부적으로 사용)
    public Store findEntityByStoreCode(String storeCode) {
        return storeRepository.findByStoreCode(storeCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.STORE_NOT_FOUND));
    }

    // 매장 수정
    @Transactional
    public StoreResponseDto update(Long id, StoreRequestDto request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.STORE_NOT_FOUND));
        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new BusinessException(ErrorCode.BRAND_NOT_FOUND));
        store.update(request.getName(), request.getLocation(), request.getStoreType(), request.getPhone(), brand);
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

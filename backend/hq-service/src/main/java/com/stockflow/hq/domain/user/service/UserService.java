package com.stockflow.hq.domain.user.service;

import com.stockflow.hq.domain.store.entity.Store;
import com.stockflow.hq.domain.store.repository.StoreRepository;
import com.stockflow.hq.domain.user.dto.UserRequestDto;
import com.stockflow.hq.domain.user.dto.UserResponseDto;
import com.stockflow.hq.domain.user.entity.User;
import com.stockflow.hq.domain.user.entity.UserRole;
import com.stockflow.hq.domain.user.repository.UserRepository;
import com.stockflow.hq.domain.warehouse.entity.Warehouse;
import com.stockflow.hq.domain.warehouse.repository.WarehouseRepository;
import com.stockflow.hq.global.exception.BusinessException;
import com.stockflow.hq.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final WarehouseRepository warehouseRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    // 회원 가입
    @Transactional
    public UserResponseDto create(UserRequestDto request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        Store store = resolveStore(request);

        // 매장 코드로 가입하는 매장 관리자(STORE_MANAGER)는 매장당 한 명만 허용
        // (코드 유출 시 여러 명이 무한정 가입하는 것을 방지하는 안전장치)
        if (store != null && request.getRole() == UserRole.STORE_MANAGER) {
            boolean alreadyHasManager = userRepository.findByStoreId(store.getId()).stream()
                    .anyMatch(u -> u.getRole() == UserRole.STORE_MANAGER);
            if (alreadyHasManager) {
                throw new BusinessException(ErrorCode.STORE_MANAGER_ALREADY_EXISTS);
            }
        }

        Warehouse warehouse = null;
        if (request.getWarehouseId() != null) {
            warehouse = warehouseRepository.findById(request.getWarehouseId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.WAREHOUSE_NOT_FOUND));
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(request.getRole())
                .store(store)
                .warehouse(warehouse)
                .build();

        return UserResponseDto.from(userRepository.save(user));
    }

    // storeCode가 있으면 그걸로 매장을 찾고, 없으면 기존처럼 storeId로 찾음 (하위 호환)
    private Store resolveStore(UserRequestDto request) {
        if (request.getStoreCode() != null && !request.getStoreCode().isBlank()) {
            return storeRepository.findByStoreCode(request.getStoreCode())
                    .orElseThrow(() -> new BusinessException(ErrorCode.STORE_NOT_FOUND));
        }
        if (request.getStoreId() != null) {
            return storeRepository.findById(request.getStoreId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.STORE_NOT_FOUND));
        }
        return null;
    }

    // 전체 조회
    public List<UserResponseDto> findAll() {
        return userRepository.findAll().stream()
                .map(UserResponseDto::from)
                .collect(Collectors.toList());
    }

    // 단건 조회
    public UserResponseDto findById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return UserResponseDto.from(user);
    }

    // 매장별 소속 사용자 조회 (매장 상세 페이지의 담당자 목록용)
    public List<UserResponseDto> findByStoreId(Long storeId) {
        return userRepository.findByStoreId(storeId).stream()
                .map(UserResponseDto::from)
                .collect(Collectors.toList());
    }

    // 수정
    @Transactional
    public UserResponseDto update(Long id, UserRequestDto request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Store store = resolveStore(request);

        Warehouse warehouse = null;
        if (request.getWarehouseId() != null) {
            warehouse = warehouseRepository.findById(request.getWarehouseId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.WAREHOUSE_NOT_FOUND));
        }

        user.update(request.getName(), request.getRole(), store, warehouse);
        return UserResponseDto.from(user);
    }

    // 삭제
    @Transactional
    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        userRepository.deleteById(id);
    }
}
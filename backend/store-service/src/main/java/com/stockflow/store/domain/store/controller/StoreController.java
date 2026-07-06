package com.stockflow.store.domain.store.controller;

import com.stockflow.store.domain.store.dto.StoreRequestDto;
import com.stockflow.store.domain.store.dto.StoreResponseDto;
import com.stockflow.store.domain.store.service.StoreService;
import com.stockflow.store.domain.user.dto.UserResponseDto;
import com.stockflow.store.domain.user.service.UserService;
import com.stockflow.store.global.docs.store.StoreApiSpecification;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController implements StoreApiSpecification {

    private final StoreService storeService;
    private final UserService userService;

    // 매장 생성
    @PostMapping
    public ResponseEntity<StoreResponseDto> createStore(
            @RequestBody @Valid StoreRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(storeService.create(request));
    }

    // 매장 전체 조회
    @GetMapping
    public ResponseEntity<List<StoreResponseDto>> getStores() {
        return ResponseEntity.ok(storeService.findAll());
    }

    // 매장 단건 조회
    @GetMapping("/{id}")
    public ResponseEntity<StoreResponseDto> getStore(@PathVariable Long id) {
        return ResponseEntity.ok(storeService.findById(id));
    }

    // 매장 코드로 조회 (회원가입 화면에서 코드 입력 시 매장명 미리보기용)
    @GetMapping("/code/{storeCode}")
    public ResponseEntity<StoreResponseDto> getStoreByCode(@PathVariable String storeCode) {
        return ResponseEntity.ok(storeService.findByStoreCode(storeCode));
    }

    // 매장 소속 담당자(사용자) 목록 조회
    @GetMapping("/{id}/users")
    public ResponseEntity<List<UserResponseDto>> getStoreUsers(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findByStoreId(id));
    }

    // 매장 수정
    @PutMapping("/{id}")
    public ResponseEntity<StoreResponseDto> updateStore(
            @PathVariable Long id,
            @RequestBody @Valid StoreRequestDto request) {
        return ResponseEntity.ok(storeService.update(id, request));
    }

    // 매장 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStore(@PathVariable Long id) {
        storeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

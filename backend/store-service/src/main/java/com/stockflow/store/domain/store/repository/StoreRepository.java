package com.stockflow.store.domain.store.repository;

import com.stockflow.store.domain.store.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Long> {

    // 매장 코드로 조회 (매장 관리자 가입 시 사용)
    Optional<Store> findByStoreCode(String storeCode);

    // 매장 코드 중복 확인 (생성 시 충돌 방지용)
    boolean existsByStoreCode(String storeCode);
}

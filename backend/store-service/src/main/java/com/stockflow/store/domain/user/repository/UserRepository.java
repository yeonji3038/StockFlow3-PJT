package com.stockflow.store.domain.user.repository;

import com.stockflow.store.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 이메일로 사용자 조회 (로그인, 중복 확인 시 사용)
    Optional<User> findByEmail(String email);

    // 매장 ID로 소속 사용자 전체 조회 (매장 상세 페이지의 담당자 목록용)
    List<User> findByStoreId(Long storeId);
}

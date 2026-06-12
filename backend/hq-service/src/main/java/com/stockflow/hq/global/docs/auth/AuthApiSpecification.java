package com.stockflow.hq.global.docs.auth;

import com.stockflow.hq.domain.auth.dto.LoginRequestDto;
import com.stockflow.hq.domain.user.dto.UserRequestDto;
import com.stockflow.hq.domain.user.dto.UserResponseDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "인증", description = "인증 관리 API")
public interface AuthApiSpecification {

    @Operation(summary = "회원가입", description = """
        💡 새로운 사용자를 등록합니다.
        
        ---
        
        **[ 요청 값 ]**
        - **email** : 이메일 (중복 불가)
        - **password** : 비밀번호
        - **name** : 이름
        - **role** : 역할
            - 본사 직원 → **HQ_STAFF**
            - 매장 관리자 → **STORE_MANAGER**
            - 창고 담당자 → **WAREHOUSE_STAFF**
            - 직원 → **STAFF**
        - **storeId** : 소속 매장 ID (본사 직원은 null)
        
        **[ 응답 필드 ]**
        - **id** : 사용자 ID
        - **email** : 이메일
        - **name** : 이름
        - **role** : 역할
        - **storeId** : 소속 매장 ID
        - **storeName** : 소속 매장명
        - **createdAt** : 가입일시
        """)
    @PostMapping("/signup")
    ResponseEntity<UserResponseDto> signup(@RequestBody @Valid UserRequestDto request);

    @Operation(summary = "로그인", description = """
        💡 이메일과 비밀번호로 로그인합니다.
        
        ---
        
        **[ 요청 값 ]**
        - **email** : 이메일
        - **password** : 비밀번호
        
        **[ 응답 ]**
        - 액세스 토큰, 리프레시 토큰이 HttpOnly 쿠키로 설정됩니다.
        """)
    @PostMapping("/login")
    ResponseEntity<Void> login(@RequestBody @Valid LoginRequestDto request,
                               HttpServletResponse response);

    @Operation(summary = "토큰 재발급", description = """
        💡 리프레시 토큰 쿠키로 액세스 토큰을 재발급합니다.
        
        ---
        
        **[ 요청 ]**
        - 쿠키의 refreshToken이 자동으로 전송됩니다.
        
        **[ 응답 ]**
        - 새로운 액세스 토큰이 HttpOnly 쿠키로 설정됩니다.
        """)
    @PostMapping("/refresh")
    ResponseEntity<Void> refresh(HttpServletRequest request,
                                 HttpServletResponse response);

    @Operation(summary = "로그아웃", description = """
        💡 로그아웃합니다. 쿠키가 삭제되고 리프레시 토큰이 Redis에서 제거됩니다.
        """)
    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest request,
                                HttpServletResponse response);
}
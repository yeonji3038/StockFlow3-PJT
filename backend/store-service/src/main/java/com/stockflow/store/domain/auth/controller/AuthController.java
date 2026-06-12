package com.stockflow.store.domain.auth.controller;

import com.stockflow.store.domain.auth.dto.LoginRequestDto;
import com.stockflow.store.domain.auth.dto.TokenResponseDto;
import com.stockflow.store.domain.auth.service.AuthService;
import com.stockflow.store.domain.user.dto.UserRequestDto;
import com.stockflow.store.domain.user.dto.UserResponseDto;
import com.stockflow.store.domain.user.service.UserService;
import com.stockflow.store.global.docs.auth.AuthApiSpecification;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.stockflow.store.domain.auth.dto.LoginResponseDto;

import java.time.Duration;
import java.util.Arrays;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController implements AuthApiSpecification {

    private final UserService userService;
    private final AuthService authService;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<UserResponseDto> signup(
            @RequestBody @Valid UserRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.create(request));
    }

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<Void> login(
            @RequestBody @Valid LoginRequestDto request,
            HttpServletResponse response) {

        LoginResponseDto tokens = authService.login(request);  // ← TokenResponseDto → LoginResponseDto

        ResponseCookie accessCookie = ResponseCookie.from("accessToken", tokens.getAccessToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(Duration.ofMinutes(30))
                .sameSite("Strict")
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", tokens.getRefreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/api/auth/refresh")
                .maxAge(Duration.ofDays(7))
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        return ResponseEntity.ok().build();
    }

    // 토큰 재발급
    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractCookie(request, "refreshToken");
        TokenResponseDto tokens = authService.refresh(refreshToken);

        ResponseCookie accessCookie = ResponseCookie.from("accessToken", tokens.getAccessToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(Duration.ofMinutes(30))
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        return ResponseEntity.ok().build();
    }

    // 로그아웃
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractCookie(request, "refreshToken");
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }

        ResponseCookie accessCookie = ResponseCookie.from("accessToken", "")
                .httpOnly(true).secure(cookieSecure).path("/").maxAge(0).sameSite("Strict").build();

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true).secure(cookieSecure).path("/api/auth/refresh").maxAge(0).sameSite("Strict").build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        return ResponseEntity.noContent().build();
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
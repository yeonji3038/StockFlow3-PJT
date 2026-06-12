package com.stockflow.hq.domain.auth.service;

import com.stockflow.hq.domain.auth.dto.LoginRequestDto;
import com.stockflow.hq.domain.auth.dto.LoginResponseDto;
import com.stockflow.hq.domain.auth.dto.TokenResponseDto;
import com.stockflow.hq.domain.user.entity.User;
import com.stockflow.hq.domain.user.repository.UserRepository;
import com.stockflow.hq.global.exception.BusinessException;
import com.stockflow.hq.global.exception.ErrorCode;
import com.stockflow.hq.global.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRedisService refreshTokenRedisService;
    private final JwtTokenProvider jwtTokenProvider;
    private final BCryptPasswordEncoder passwordEncoder;

    // 로그인
    @Transactional
    public LoginResponseDto login(LoginRequestDto request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_PASSWORD));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }

        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getEmail(),
                user.getRole().name(),
                user.getStore() != null ? user.getStore().getId() : null,
                user.getWarehouse() != null ? user.getWarehouse().getId() : null
        );

        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        // Redis에 저장 (TTL 7일 자동 적용)
        refreshTokenRedisService.save(user.getEmail(), refreshToken);

        return LoginResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .storeId(user.getStore() != null ? user.getStore().getId() : null)
                .warehouseId(user.getWarehouse() != null ? user.getWarehouse().getId() : null)
                .build();
    }

    // 토큰 재발급
    @Transactional
    public TokenResponseDto refresh(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        String email = jwtTokenProvider.getEmail(refreshToken);

        // Redis에서 조회
        String savedToken = refreshTokenRedisService.get(email);

        if (savedToken == null) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_NOT_FOUND);
        }

        if (!savedToken.equals(refreshToken)) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISMATCH);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String newAccessToken = jwtTokenProvider.generateAccessToken(
                user.getEmail(),
                user.getRole().name(),
                user.getStore() != null ? user.getStore().getId() : null,
                user.getWarehouse() != null ? user.getWarehouse().getId() : null
        );

        return TokenResponseDto.builder()
                .accessToken(newAccessToken)
                .build();
    }

    // 로그아웃
    public void logout(String refreshToken) {
        String email = jwtTokenProvider.getEmail(refreshToken);
        refreshTokenRedisService.delete(email);
    }
}
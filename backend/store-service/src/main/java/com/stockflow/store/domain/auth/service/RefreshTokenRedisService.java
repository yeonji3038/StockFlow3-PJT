package com.stockflow.store.domain.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RefreshTokenRedisService {

    private final StringRedisTemplate redisTemplate;
    private static final String PREFIX = "refresh:";
    private static final long TTL_DAYS = 7;

    public void save(String email, String refreshToken) {
        redisTemplate.opsForValue()
                .set(PREFIX + email, refreshToken, TTL_DAYS, TimeUnit.DAYS);
    }

    public String get(String email) {
        return redisTemplate.opsForValue().get(PREFIX + email);
    }

    public void delete(String email) {
        redisTemplate.delete(PREFIX + email);
    }
}
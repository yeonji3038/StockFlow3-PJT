package com.stockflow.hq.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AiServiceConfig {

    // application.yml 에 ai.service.base-url 추가 필요
    // 로컬: http://localhost:8000 / k8s 배포 시: http://ai-service:8000 (서비스명)
    @Value("${ai.service.base-url:http://localhost:8000}")
    private String aiServiceBaseUrl;

    @Bean
    public RestTemplate aiServiceRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        // AI 서버 장애 시 발주 화면 전체가 멈추지 않도록 타임아웃을 짧게 설정
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(3000);
        return new RestTemplate(factory);
    }

    public String getAiServiceBaseUrl() {
        return aiServiceBaseUrl;
    }
}

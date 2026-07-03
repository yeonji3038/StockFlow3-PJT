package com.stockflow.hq;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;


@SpringBootApplication
@EnableJpaAuditing
public class HqApplication {
    public static void main(String[] args) {
        SpringApplication.run(HqApplication.class, args);
    }
}
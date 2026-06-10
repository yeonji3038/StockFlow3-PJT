# 🏭 StockFlow-3차
**매장–본사 통합 재고관리 플랫폼 (MES + Kubernetes + AI)**  

📅 프로젝트 기간: 2026.04.13 ~ 진행 중  

> 💡 “엑셀 대신 AI가, 수작업 대신 자동화가 — 패션 브랜드를 위한 스마트 MES 시스템”

---
1. **[프로젝트 소개](#프로젝트-소개)**
2. **[기술 스택](#기술-스택)**
3. **[주요 기능](#주요-기능)**
4. **[시스템 아키텍쳐](#시스템-아키텍쳐)**
5. **[동작](#동작)**
6. **[서비스 화면](#서비스-화면)**


<br />

## 프로젝트 소개

패션 브랜드 매장 실무자들과의 인터뷰를 통해
수작업으로 **재고를 집계하고 엑셀로 보고서**를 작성하는 **반복적인** 비효율을 확인하게 되었습니다.

실시간으로 파악되지 않는 재고 현황, 수작업 발주로 인한 과발주·품절 반복, 본사와 매장 간 재고 불일치…

이러한 실제 패션 브랜드 운영자들의 고충을 해결하기 위해,
**MES(Manufacturing Execution System)** 구조를 기반으로 **본사·매장·창고**를 통합하여 **재고 흐름을 실시간**으로 관리하는
**StockFlow** 프로젝트를 기획·개발하게 되었습니다.

> 🚀 **Spring Boot + React + Kafka + Redis + Kubernetes + AI** 기반으로  
> 배분·발주 자동화부터 수요 예측·이상탐지까지
> 패션 브랜드의 재고관리를 스마트하게 혁신하는 통합 플랫폼입니다.

</br>

---

## 기술 스택
### ✔️Frond-end
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"> <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=TypeScript&logoColor=white"> <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=yellow"> <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white"> <img src="https://img.shields.io/badge/Zustand-000000?style=for-the-badge&logo=zustand&logoColor=white"> <img src="https://img.shields.io/badge/Recharts-FF7300?style=for-the-badge&logo=recharts&logoColor=white">


### ✔️Back-end
<img src="https://img.shields.io/badge/Java-007396?style=for-the-badge&logo=Java&logoColor=white"> <img src="https://img.shields.io/badge/Spring%20Boot-6DB33F?style=for-the-badge&logo=Spring%20Boot&logoColor=yellow"> <img src="https://img.shields.io/badge/Spring%20Security-6DB33F?style=for-the-badge&logo=Spring%20Security&logoColor=white"> <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20Web%20Tokens&logoColor=white"> <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=PostgreSQL&logoColor=white"> <img src="https://img.shields.io/badge/Hibernate-59666C?style=for-the-badge&logo=Hibernate&logoColor=white"> <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=Swagger&logoColor=black"> <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=Redis&logoColor=white"> <img src="https://img.shields.io/badge/Apache%20Kafka-231F20?style=for-the-badge&logo=Apache%20Kafka&logoColor=white"> <img src="https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=Socket.io&logoColor=white"> <img src="https://img.shields.io/badge/Gradle-02303A?style=for-the-badge&logo=Gradle&logoColor=white"> <img src="https://img.shields.io/badge/JUnit5-25A162?style=for-the-badge&logo=JUnit5&logoColor=white">


### ✔️Infra
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=Docker&logoColor=white"> <img src="https://img.shields.io/badge/Docker%20Compose-2496ED?style=for-the-badge&logo=Docker&logoColor=white"> <img src="https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=Kubernetes&logoColor=white"> <img src="https://img.shields.io/badge/k3s-FFC61C?style=for-the-badge&logo=k3s&logoColor=black"> <img src="https://img.shields.io/badge/Helm-0F1689?style=for-the-badge&logo=Helm&logoColor=white"> <img src="https://img.shields.io/badge/Amazon%20EC2-FF9900?style=for-the-badge&logo=Amazon%20EC2&logoColor=white"> <img src="https://img.shields.io/badge/Amazon%20ECR-FF9900?style=for-the-badge&logo=Amazon%20AWS&logoColor=white"> <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=GitHub%20Actions&logoColor=white"> <img src="https://img.shields.io/badge/ArgoCD-EF7B4D?style=for-the-badge&logo=Argo&logoColor=white">


### ✔️ Tools
<img src="https://img.shields.io/badge/IntelliJ%20IDEA-000000?style=for-the-badge&logo=IntelliJ%20IDEA&logoColor=white"> <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=GitHub&logoColor=white"> <img src="https://img.shields.io/badge/k6-7D64FF?style=for-the-badge&logo=k6&logoColor=white"> 


<br/>

## 주요 기능 

| 기능 | 내용 |
|:---:|---|
| **매장 / 본사 재고 관리** | 매장별 실시간 재고 조회·입출고 처리, 본사 통합 대시보드에서 전체 현황 확인 및 매장 간 재고 배분·발주 승인 워크플로우 제공 |
| **이벤트 기반 실시간 동기화** | 매장 입출고 발생 시 Kafka 이벤트를 발행하여 본사 서비스에 즉시 반영, REST 동기 호출 없이 비동기 스트림으로 서비스 간 장애 전파 차단 |
| **Redis 캐싱 및 성능 최적화** | 실시간 재고 조회 요청을 Redis 캐시로 처리하여 DB 병목 제거, WebSocket으로 화면 실시간 업데이트 (Polling 방식 대비 응답속도 개선) |
| **역할 기반 인증 및 접근 제어** | Spring Security + JWT로 매장 직원 / 본사 관리자 역할을 분리하여 API 및 화면 접근 권한 제어 |
| **Kubernetes(k3s) 배포** | Helm Chart로 환경별 배포 설정 관리, HPA 자동 스케일링으로 트래픽 급증 대응 |
| **GitOps 자동 배포 파이프라인** | GitHub Actions로 코드 푸시 시 Docker 이미지 빌드·ECR 푸시 자동화, ArgoCD가 Git 상태를 감지하여 k3s 클러스터에 무중단 롤링 배포 |


<br/>

## 시스템 아키텍쳐

### MSA 서비스 구조 (Gradle 멀티모듈)

```
backend/
├── common/         ← JWT, Kafka DTO, 공통 설정
├── store-service/  ← 매장 서비스 (port: 8081)
└── hq-service/     ← 본사 서비스 (port: 8082)
```

### Kafka 이벤트 흐름

```
store-service (재고 변동 발생)
    → Kafka [stock-change-events] 토픽 발행
        → hq-service 실시간 수신 및 재고 부족 감지
```

> 서비스 간 직접 호출(REST) 없이 Kafka 이벤트로만 통신하여 서비스 간 결합도를 낮추고 장애 전파를 차단합니다.

<br/>

---

## 동작

### 🚀 서비스 독립 실행 (Docker Compose)

<img width="1460" height="149" alt="image" src="https://github.com/user-attachments/assets/ff454b52-dcf0-44e2-b14b-934ad80c3275" />

### 📨 Kafka 이벤트 통신 증명


**Consumer 구독 연결**
<img width="1624" height="92" alt="image (1)" src="https://github.com/user-attachments/assets/9af9ada1-f7de-4f48-8903-3bf4c00959d2" />

**store-service → 이벤트 발행**
<img width="1627" height="162" alt="image (3)" src="https://github.com/user-attachments/assets/509eabd7-aa3c-4b9a-ab41-3aaae0a09f2a" />

**hq-service → 이벤트 수신**
<img width="1611" height="438" alt="image (2)" src="https://github.com/user-attachments/assets/cf3cb534-492d-4b98-94eb-5f7f8ee68bb9" />


### 📊 k6 부하 테스트

**동시 50명**
<img width="1418" height="916" alt="스크린샷 2026-06-10 오후 4 15 47" src="https://github.com/user-attachments/assets/b74f306e-839d-408b-b57d-50934639363c" />

| 항목 | 수치 |
|:---:|:---:|
| 총 요청 수 | 1,204건 |
| 에러율 | **0.00%** |
| 평균 응답시간 | **9.62ms** |
| p(95) 응답시간 | **19.29ms** |
| 최대 응답시간 | 106.27ms |
| 초당 처리량 | **23.6 RPS** |

<br/>

---

**동시 500명 (한계점 테스트)**
<img width="838" height="457" alt="k6 부하테스트 500명 결과" src="https://github.com/user-attachments/assets/cbb60bb6-8135-438c-b0a1-5bf3685d80bd" />

| 항목 | 결과 |
| --- | --- |
| 에러율 | **0%** |
| 평균 응답시간 | **3.57ms** |
| p90 응답시간 | 6.58ms |
| p95 응답시간 | 9.7ms |
| 최대 응답시간 | 100.05ms |
| 처리량 | **249 req/s** |
| status 200 | **100%** |

<br/>

---

### ⚡ Redis 캐싱 Before/After

**Before**
<img width="838" height="464" alt="Redis 캐싱 효과 Before" src="https://github.com/user-attachments/assets/99c62f3b-3a07-4a43-8704-7cf7b4be4c1f" />

**After**
<img width="820" height="447" alt="Redis 캐싱 효과 After" src="https://github.com/user-attachments/assets/d24fafa9-de23-4ac1-a7e6-7191e9a2a635" />

**Redis 캐싱 효과 Before/After (100 VUs, 30s)**

| 항목 | Before (캐시 없음) | After (캐시 있음) | 개선율 |
| --- | --- | --- | --- |
| 평균 응답시간 | 15.54ms | 7.61ms | **51% 단축** |
| p95 응답시간 | 8.52ms | 13.76ms | - |
| 최대 응답시간 | 593.43ms | 177.59ms | **70% 단축** |
| 에러율 | 0.33% | 0% | **완전 제거** |
| checks 성공률 | 99.66% | 100% | ✅ |


<br/>

---

### 🛠️ Gradle 캐싱 최적화 + CI/CD

**Before**
<img width="1131" height="341" alt="Gradle 캐싱 최적화 before" src="https://github.com/user-attachments/assets/3abe64d8-1811-47d2-a65d-64f44ef62154" />

**After**
<img width="1123" height="338" alt="Gradle 캐싱 최적화 after" src="https://github.com/user-attachments/assets/5b9995c6-0eb1-4ee7-b057-5e08a1eb9a8e" />

**최종 측정 결과 (3회)**

| 실행 | Build with Gradle | 전체 |
| --- | --- | --- |
| Before (캐시 없음) | 47s | 1m 29s |
| After 1차 (캐시 저장) | 51s | 1m 31s |
| After 2차 (캐시 히트) | 16s | 56s |
| After 3차 (캐시 히트) | 16s | 56s |

<br/>

---


### 🧪 JaCoCo 테스트 커버리지
<img width="1151" height="897" alt="단위테스트" src="https://github.com/user-attachments/assets/b28f2bf4-9eb3-447b-88e4-ce25cff313c4" />



<br/>

---

## 서비스 화면


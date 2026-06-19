FROM eclipse-temurin:21-jdk-jammy
WORKDIR /app
COPY hq-service/build/libs/hq-service.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]

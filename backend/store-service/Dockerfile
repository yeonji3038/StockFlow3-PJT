FROM eclipse-temurin:21-jdk-jammy
WORKDIR /app
COPY store-service/build/libs/store-service.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]

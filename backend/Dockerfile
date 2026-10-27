FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S atie && adduser -S atie -G atie
WORKDIR /app
COPY --from=build /workspace/target/atie-backend-0.0.1-SNAPSHOT.jar app.jar
USER atie
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
    CMD wget -q -O - http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

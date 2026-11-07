FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S atie && adduser -S atie -G atie
WORKDIR /app
COPY --from=build /workspace/target/atie-backend-0.0.1-SNAPSHOT.jar app.jar
USER atie
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
    CMD wget -q -O - http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]

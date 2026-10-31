package com.modelx.atie.client;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.dto.MarketForecast;

@Component
public class MlServiceClient implements ForecastClient {
    private static final Logger log = LoggerFactory.getLogger(MlServiceClient.class);
    private static final Set<String> FORECAST_SOURCES = Set.of(
            "MODEL",
            "FALLBACK",
            "DEMO_FIXTURE"
    );
    private static final Set<String> DATA_STATES = Set.of(
            "LIVE",
            "CACHED",
            "SEED"
    );

    private final RestClient client;
    private final AtieProperties properties;
    private final JsonNode fallbackSnapshot;

    public MlServiceClient(
            RestClient.Builder builder,
            AtieProperties properties,
            ObjectMapper objectMapper
    ) {
        this.client = builder
                .baseUrl(properties.mlServiceUrl())
                .build();
        this.properties = properties;
        this.fallbackSnapshot = loadFallbackSnapshot(objectMapper);
    }

    @Override
    public MlForecastResponse predictBatch(
            String cropCode,
            int horizonHours,
            LocalDate referenceDate,
            List<String> markets,
            boolean demoMode
    ) {
        try {
            MlForecastResponse response = client.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/predict-batch")
                            .queryParam("demo_mode", demoMode)
                            .build())
                    .body(Map.of(
                            "crop_code", cropCode,
                            "horizon_hours", horizonHours,
                            "reference_date", referenceDate.toString(),
                            "markets", markets
                    ))
                    .retrieve()
                    .body(MlForecastResponse.class);
            validateResponse(
                    response,
                    cropCode,
                    horizonHours,
                    markets,
                    demoMode
            );
            return response;
        } catch (RestClientResponseException error) {
            if (error.getStatusCode().is4xxClientError()) {
                throw new MlServiceException(
                        HttpStatus.valueOf(error.getStatusCode().value()),
                        "ML_REJECTED_REQUEST",
                        bounded(error.getResponseBodyAsString()),
                        error
                );
            }
            log.warn("ML service returned {}; using fallback", error.getStatusCode());
            return fallback(cropCode, horizonHours, referenceDate, markets, demoMode);
        } catch (ResourceAccessException error) {
            log.warn("ML service is unreachable; using fallback: {}", error.getMessage());
            return fallback(cropCode, horizonHours, referenceDate, markets, demoMode);
        } catch (RestClientException error) {
            log.warn("ML transport failed; using fallback: {}", error.getMessage());
            return fallback(cropCode, horizonHours, referenceDate, markets, demoMode);
        }
    }

    private void validateResponse(
            MlForecastResponse response,
            String cropCode,
            int horizonHours,
            List<String> markets,
            boolean demoMode
    ) {
        if (response == null || response.predictions() == null
                || response.predictions().isEmpty()) {
            throw contractError("ML service returned no predictions");
        }
        if (!cropCode.equals(response.cropCode())) {
            throw contractError("ML service returned a mismatched crop");
        }
        if (horizonHours != response.horizonHours()) {
            throw contractError("ML service returned a mismatched horizon");
        }
        if (response.referenceDate() == null) {
            throw contractError("ML service returned no reference date");
        }
        if (!FORECAST_SOURCES.contains(response.forecastSource())) {
            throw contractError("ML service returned an invalid forecast source");
        }
        if (!DATA_STATES.contains(response.inputDataState())) {
            throw contractError("ML service returned an invalid input data state");
        }
        if (demoMode && !"DEMO_FIXTURE".equals(response.forecastSource())) {
            throw contractError("ML demo request did not resolve to DEMO_FIXTURE");
        }
        if (!demoMode && !Set.of("MODEL", "FALLBACK")
                .contains(response.forecastSource())) {
            throw contractError("ML live request returned a demo fixture");
        }

        Set<String> expectedMarkets = new HashSet<>(markets);
        Set<String> returnedMarkets = new HashSet<>();
        for (MarketForecast prediction : response.predictions()) {
            if (prediction == null || prediction.marketCode() == null) {
                throw contractError("ML service returned an empty market forecast");
            }
            if (!returnedMarkets.add(prediction.marketCode())) {
                throw contractError("ML service returned duplicate market forecasts");
            }
            validateForecast(prediction);
        }
        if (!expectedMarkets.equals(returnedMarkets)) {
            throw contractError(
                    "ML forecast markets do not match the requested markets"
            );
        }
    }

    private void validateForecast(MarketForecast forecast) {
        if (forecast.currentPriceLkr() == null
                || forecast.predictedPriceLkr() == null
                || forecast.baselineNaiveLkr() == null
                || forecast.baselineMa7Lkr() == null
                || forecast.currentPriceLkr().signum() <= 0
                || forecast.predictedPriceLkr().signum() <= 0
                || forecast.baselineNaiveLkr().signum() <= 0
                || forecast.baselineMa7Lkr().signum() <= 0) {
            throw contractError("ML service returned non-positive price data");
        }
        if (!Set.of("CRASH", "STABLE", "SURGE").contains(forecast.direction())) {
            throw contractError("ML service returned an invalid direction");
        }
        if (forecast.confidenceScore() == null
                || forecast.confidenceScore().signum() < 0
                || forecast.confidenceScore().compareTo(BigDecimal.ONE) > 0) {
            throw contractError("ML service returned an invalid confidence score");
        }
    }

    private MlForecastResponse fallback(
            String cropCode,
            int horizonHours,
            LocalDate referenceDate,
            List<String> markets,
            boolean demoMode
    ) {
        String section = demoMode ? "demo_fixture" : "markets";
        JsonNode cropData = fallbackSnapshot.path(section).path(cropCode);
        if (!cropData.isObject()) {
            if (demoMode) {
                throw new MlServiceException(
                        HttpStatus.BAD_REQUEST,
                        "ML_REJECTED_REQUEST",
                        "the canonical demo fixture is only available for TOMATO"
                );
            }
            throw fallbackUnavailable("No fallback snapshot exists for " + cropCode);
        }
        String source = demoMode ? "DEMO_FIXTURE" : "FALLBACK";
        String dataState = fallbackSnapshot.path("input_data_state")
                .asText("SEED");
        LocalDate fallbackDate = LocalDate.parse(
                fallbackSnapshot.path("reference_date")
                        .asText(referenceDate.toString())
        );
        List<MarketForecast> predictions = markets.stream()
                .map(marketCode -> fallbackForecast(
                        cropData,
                        marketCode,
                        horizonHours
                ))
                .toList();
        return new MlForecastResponse(
                cropCode,
                horizonHours,
                fallbackDate,
                source,
                demoMode
                        ? "demo-fixture-v1.0"
                        : fallbackSnapshot.path("model_version")
                                .asText("backend-fallback-v1.0"),
                dataState,
                predictions
        );
    }

    private MarketForecast fallbackForecast(
            JsonNode cropData,
            String marketCode,
            int horizonHours
    ) {
        JsonNode fixture = cropData.path(marketCode).path(
                String.valueOf(horizonHours)
        );
        if (!fixture.isObject()) {
            throw fallbackUnavailable(
                    "Fallback snapshot is missing " + marketCode + "/" + horizonHours
            );
        }
        BigDecimal current = decimal(fixture, "current_price_lkr");
        BigDecimal predicted = decimal(fixture, "predicted_price_lkr");
        BigDecimal ma7 = decimal(fixture, "baseline_ma7_lkr");
        BigDecimal change = predicted.subtract(current)
                .divide(current, MathContext.DECIMAL128)
                .multiply(new BigDecimal("100"));
        String direction = change.compareTo(
                properties.movementThresholdPct().negate()
        ) <= 0
                ? "CRASH"
                : change.compareTo(properties.movementThresholdPct()) >= 0
                ? "SURGE"
                : "STABLE";
        return new MarketForecast(
                marketCode,
                current,
                predicted,
                current,
                ma7,
                change.setScale(2, RoundingMode.HALF_UP),
                direction,
                fixture.path("glut_risk_level").asText("MEDIUM"),
                decimal(fixture, "confidence_score"),
                fixture.path("primary_driver").asText("Fallback forecast snapshot")
        );
    }

    private BigDecimal decimal(JsonNode fixture, String field) {
        JsonNode value = fixture.get(field);
        if (value == null || !value.isNumber()) {
            throw fallbackUnavailable(
                    "Fallback snapshot field is missing: " + field
            );
        }
        return value.decimalValue();
    }

    private JsonNode loadFallbackSnapshot(ObjectMapper objectMapper) {
        try (var input = new ClassPathResource("fallback_forecasts.json")
                .getInputStream()) {
            return objectMapper.readTree(input);
        } catch (Exception error) {
            throw new IllegalStateException("Fallback forecast snapshot is invalid", error);
        }
    }

    private MlServiceException contractError(String message) {
        return new MlServiceException(
                HttpStatus.BAD_GATEWAY,
                "ML_CONTRACT_ERROR",
                message
        );
    }

    private MlServiceException fallbackUnavailable(String message) {
        return new MlServiceException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "FALLBACK_UNAVAILABLE",
                message
        );
    }

    private String bounded(String message) {
        if (message == null || message.isBlank()) {
            return "ML service rejected the request";
        }
        return message.length() <= 500 ? message : message.substring(0, 500);
    }

    public record MlForecastResponse(
            @JsonProperty("crop_code") String cropCode,
            @JsonProperty("horizon_hours") int horizonHours,
            @JsonProperty("reference_date") LocalDate referenceDate,
            @JsonProperty("forecast_source") String forecastSource,
            @JsonProperty("model_version") String modelVersion,
            @JsonProperty("input_data_state") String inputDataState,
            List<MarketForecast> predictions
    ) {
    }
}

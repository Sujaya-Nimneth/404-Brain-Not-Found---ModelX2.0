package com.modelx.atie.client;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.dto.MarketForecast;

@Component
public class MlServiceClient implements ForecastClient {
    private static final Logger log = LoggerFactory.getLogger(MlServiceClient.class);

    private final RestClient client;

    public MlServiceClient(RestClient.Builder builder, AtieProperties properties) {
        this.client = builder.baseUrl(properties.mlServiceUrl()).build();
    }

    @Override
    public MlForecastResponse predictBatch(
            String cropCode,
            int horizonHours,
            LocalDate referenceDate,
            List<String> markets
    ) {
        try {
            MlForecastResponse response = client.post()
                    .uri("/predict-batch")
                    .body(Map.of(
                            "crop_code", cropCode,
                            "horizon_hours", horizonHours,
                            "reference_date", referenceDate.toString(),
                            "markets", markets
                    ))
                    .retrieve()
                    .body(MlForecastResponse.class);
            if (response == null || response.predictions() == null) {
                throw new IllegalStateException("ML service returned no predictions");
            }
            return response;
        } catch (RestClientException | IllegalStateException error) {
            log.warn("ML service unavailable; using deterministic fallback: {}", error.getMessage());
            return fallback(cropCode, horizonHours, referenceDate, markets);
        }
    }

    private MlForecastResponse fallback(
            String cropCode,
            int horizonHours,
            LocalDate referenceDate,
            List<String> markets
    ) {
        Map<String, FallbackMarket> fixtures = Map.of(
                "DAMBULLA", new FallbackMarket(
                        new BigDecimal("220.00"),
                        horizonHours == 48
                                ? new BigDecimal("154.00")
                                : new BigDecimal("155.00"),
                        new BigDecimal("237.76"),
                        "HIGH",
                        new BigDecimal("0.89"),
                        "Supply glut from Northern province harvest."
                ),
                "PETTAH_COLOMBO", new FallbackMarket(
                        new BigDecimal("170.00"),
                        horizonHours == 48
                                ? new BigDecimal("187.50")
                                : new BigDecimal("188.50"),
                        new BigDecimal("171.20"),
                        "LOW",
                        new BigDecimal("0.86"),
                        "High urban demand."
                ),
                "KEPPETIPOLA", new FallbackMarket(
                        new BigDecimal("175.00"),
                        horizonHours == 48
                                ? new BigDecimal("165.00")
                                : new BigDecimal("166.00"),
                        new BigDecimal("176.40"),
                        "MEDIUM",
                        new BigDecimal("0.75"),
                        "Hill-country transit risk."
                ),
                "MEEGODA", new FallbackMarket(
                        new BigDecimal("180.00"),
                        horizonHours == 48
                                ? new BigDecimal("172.00")
                                : new BigDecimal("173.00"),
                        new BigDecimal("181.30"),
                        "LOW",
                        new BigDecimal("0.74"),
                        "Balanced western arrivals."
                )
        );

        List<MarketForecast> predictions = markets.stream()
                .map(marketCode -> {
                    FallbackMarket fixture = fixtures.get(marketCode);
                    if (fixture == null) {
                        throw new IllegalArgumentException(
                                "No fallback for market " + marketCode
                        );
                    }
                    BigDecimal change = fixture.predicted()
                            .subtract(fixture.current())
                            .divide(fixture.current(), java.math.MathContext.DECIMAL128)
                            .multiply(new BigDecimal("100"))
                            .setScale(2, java.math.RoundingMode.HALF_UP);
                    String direction = change.compareTo(new BigDecimal("-10")) <= 0
                            ? "CRASH"
                            : change.compareTo(new BigDecimal("10")) >= 0
                            ? "SURGE"
                            : "STABLE";
                    return new MarketForecast(
                            marketCode,
                            fixture.current(),
                            fixture.predicted(),
                            fixture.current(),
                            fixture.ma7(),
                            change,
                            direction,
                            fixture.glutRisk(),
                            fixture.confidence(),
                            fixture.driver()
                    );
                })
                .toList();
        return new MlForecastResponse(
                cropCode,
                horizonHours,
                referenceDate,
                "FALLBACK",
                "backend-fallback-v1.0",
                predictions
        );
    }

    public record MlForecastResponse(
            @JsonProperty("crop_code") String cropCode,
            @JsonProperty("horizon_hours") int horizonHours,
            @JsonProperty("reference_date") LocalDate referenceDate,
            @JsonProperty("forecast_source") String forecastSource,
            @JsonProperty("model_version") String modelVersion,
            List<MarketForecast> predictions
    ) {
    }

    private record FallbackMarket(
            BigDecimal current,
            BigDecimal predicted,
            BigDecimal ma7,
            String glutRisk,
            BigDecimal confidence,
            String driver
    ) {
    }
}

package com.modelx.atie.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.modelx.atie.client.ForecastClient;
import com.modelx.atie.client.MlServiceClient;
import com.modelx.atie.client.MlMetricsClient;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.config.OriginCatalog;
import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.dto.AnalyzeRequest;
import com.modelx.atie.dto.AnalyzeResponse;
import com.modelx.atie.dto.MarketComparison;
import com.modelx.atie.dto.MarketForecast;
import com.modelx.atie.entity.Crop;
import com.modelx.atie.entity.FuelPrice;
import com.modelx.atie.entity.Market;
import com.modelx.atie.entity.MarketRoute;
import com.modelx.atie.entity.WeatherObservation;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.FuelPriceRepository;
import com.modelx.atie.repository.MarketRouteRepository;
import com.modelx.atie.repository.WeatherObservationRepository;

class ArbitrageRoutingServiceTest {
    private final ProfitMarginCalculator calculator = new ProfitMarginCalculator();
    private final AtieProperties properties = new AtieProperties(
            "http://localhost:8000",
            new BigDecimal("5.0"),
            new BigDecimal("1000.00"),
            new BigDecimal("10.0"),
            List.of("http://localhost:5173"),
            ""
    );

    private CropRepository crops;
    private MarketRouteRepository routes;
    private FuelPriceRepository fuelPrices;
    private WeatherObservationRepository weather;
    private ForecastClient forecastClient;
    private MlMetricsClient metricsClient;
    private ArbitrageRoutingService service;

    @BeforeEach
    void setUp() {
        crops = stub(CropRepository.class);
        routes = stub(MarketRouteRepository.class);
        fuelPrices = stub(FuelPriceRepository.class);
        weather = stub(WeatherObservationRepository.class);
        forecastClient = (cropCode, horizonHours, referenceDate, markets, demoMode) ->
                fixtureForecast();
        metricsClient = stub(MlMetricsClient.class);
        service = new ArbitrageRoutingService(
                crops,
                routes,
                fuelPrices,
                weather,
                new OriginCatalog(),
                forecastClient,
                metricsClient,
                calculator,
                new RoutingDecisionService(properties),
                properties
        );
    }

    @Test
    void canonicalScenarioProducesCriticalReroute() {
        Crop tomato = entity(Crop.class, "id", 1L, "code", "TOMATO", "name", "Tomato",
                "spoilageRatePer100KmPct", new BigDecimal("1.50"));
        Market dambulla = market(1L, "DAMBULLA", "Dambulla", "70");
        Market pettah = market(2L, "PETTAH_COLOMBO", "Pettah", "205");
        Market meegoda = market(3L, "MEEGODA", "Meegoda", "195");
        Market keppetipola = market(4L, "KEPPETIPOLA", "Keppetipola", "175");
        FuelPrice fuel = entity(FuelPrice.class, "id", 1L,
                "effectiveDate", LocalDate.of(2026, 10, 1),
                "dieselLkrPerLiter", new BigDecimal("283"),
                "petrolLkrPerLiter", new BigDecimal("311"));

        when(crops.findByCode("TOMATO")).thenReturn(Optional.of(tomato));
        when(routes.findByOriginCodeOrderByDistanceKmAsc("ANURADHAPURA"))
                .thenReturn(List.of(
                        route("ANURADHAPURA", dambulla, "70", "1.00"),
                        route("ANURADHAPURA", pettah, "205", "1.00"),
                        route("ANURADHAPURA", meegoda, "195", "1.00"),
                        route("ANURADHAPURA", keppetipola, "175", "1.25")
                ));
        when(fuelPrices.findTopByOrderByEffectiveDateDesc()).thenReturn(Optional.of(fuel));
        when(weather.findTopByMarketCodeOrderByObservationDateDesc(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(Optional.empty());
        AnalyzeResponse response = service.analyze(new AnalyzeRequest(
                "ANURADHAPURA",
                "DAMBULLA",
                "TOMATO",
                new BigDecimal("1000"),
                VehicleType.MINI_TRUCK_BATTA,
                48,
                true
        ));

        assertThat(response.forecastSource()).isEqualTo("DEMO_FIXTURE");
        assertThat(response.primaryDirective().severity()).isEqualTo("CRITICAL_REROUTE");
        assertThat(response.primaryDirective().recommendedMarketCode())
                .isEqualTo("PETTAH_COLOMBO");
        assertThat(response.primaryDirective().profitDeltaLkr())
                .isEqualByComparingTo("23238.58");
        assertThat(response.primaryDirective().profitUpliftPct())
                .isEqualByComparingTo("15.84");
        MarketComparison recommended = response.marketComparisons().stream()
                .filter(MarketComparison::recommended)
                .findFirst()
                .orElseThrow();
        assertThat(recommended.marketCode()).isEqualTo("PETTAH_COLOMBO");
    }

    @Test
    void unknownOriginReturnsClearValidationError() {
        assertThatThrownBy(() -> service.analyze(new AnalyzeRequest(
                "UNKNOWN",
                "DAMBULLA",
                "TOMATO",
                new BigDecimal("1000"),
                VehicleType.MINI_TRUCK_BATTA,
                48,
                false
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown origin");
    }

    private MlServiceClient.MlForecastResponse fixtureForecast() {
        return new MlServiceClient.MlForecastResponse(
                "TOMATO",
                48,
                LocalDate.of(2026, 10, 27),
                "DEMO_FIXTURE",
                "demo-fixture-v1.0",
                "SEED",
                List.of(
                        forecast("DAMBULLA", "220", "154", "HIGH"),
                        forecast("PETTAH_COLOMBO", "170", "187.50", "LOW"),
                        forecast("MEEGODA", "180", "172", "LOW"),
                        forecast("KEPPETIPOLA", "175", "165", "MEDIUM"),
                        forecast("NUWARA_ELIYA", "185", "182", "MEDIUM"),
                        forecast("THAMBUTTEGAMA", "190", "174", "HIGH"),
                        forecast("JAFFNA", "160", "158", "LOW")
                )
        );
    }

    private MarketForecast forecast(
            String market,
            String current,
            String predicted,
            String glutRisk
    ) {
        BigDecimal currentValue = new BigDecimal(current);
        BigDecimal predictedValue = new BigDecimal(predicted);
        BigDecimal change = predictedValue.subtract(currentValue)
                .divide(currentValue, java.math.MathContext.DECIMAL128)
                .multiply(new BigDecimal("100"))
                .setScale(2, java.math.RoundingMode.HALF_UP);
        String direction = change.compareTo(new BigDecimal("-10")) <= 0
                ? "CRASH"
                : change.compareTo(new BigDecimal("10")) >= 0
                ? "SURGE"
                : "STABLE";
        return new MarketForecast(
                market,
                currentValue,
                predictedValue,
                currentValue,
                currentValue,
                change,
                direction,
                glutRisk,
                new BigDecimal("0.85"),
                "Test driver"
        );
    }

    private Market market(Long id, String code, String name, String distance) {
        Market market = entity(Market.class, "id", id,
                "code", code,
                "name", name,
                "province", "Test",
                "handlingFeePerKgLkr", new BigDecimal("2.50"));
        return market;
    }

    private MarketRoute route(
            String origin,
            Market destination,
            String distance,
            String terrain
    ) {
        return entity(MarketRoute.class,
                "originCode", origin,
                "destinationMarket", destination,
                "distanceKm", new BigDecimal(distance),
                "roadTerrainFactor", new BigDecimal(terrain));
    }

    private <T> T entity(Class<T> type, Object... values) {
        try {
            var constructor = type.getDeclaredConstructor();
            constructor.setAccessible(true);
            T entity = constructor.newInstance();
            for (int index = 0; index < values.length; index += 2) {
                ReflectionTestUtils.setField(entity, (String) values[index], values[index + 1]);
            }
            return entity;
        } catch (ReflectiveOperationException error) {
            throw new IllegalStateException(error);
        }
    }

    private <T> T stub(Class<T> type) {
        return org.mockito.Mockito.mock(type);
    }

    private <T> org.mockito.stubbing.OngoingStubbing<T> when(T value) {
        return org.mockito.Mockito.when(value);
    }
}

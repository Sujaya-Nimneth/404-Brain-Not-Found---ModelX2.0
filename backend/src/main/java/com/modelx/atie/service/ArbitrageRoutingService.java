package com.modelx.atie.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.modelx.atie.client.ForecastClient;
import com.modelx.atie.client.MlMetricsClient;
import com.modelx.atie.client.MlServiceClient;
import com.modelx.atie.client.MlServiceException;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.config.OriginCatalog;
import com.modelx.atie.domain.Origin;
import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.dto.AnalyzeRequest;
import com.modelx.atie.dto.AnalyzeResponse;
import com.modelx.atie.dto.MarketComparison;
import com.modelx.atie.dto.MarketForecast;
import com.modelx.atie.dto.ProfitBreakdown;
import com.modelx.atie.dto.WeatherAlert;
import com.modelx.atie.entity.Crop;
import com.modelx.atie.entity.FuelPrice;
import com.modelx.atie.entity.Market;
import com.modelx.atie.entity.MarketRoute;
import com.modelx.atie.entity.WeatherObservation;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.FuelPriceRepository;
import com.modelx.atie.repository.MarketRouteRepository;
import com.modelx.atie.repository.WeatherObservationRepository;

@Service
public class ArbitrageRoutingService {
    private static final ZoneId COLOMBO_ZONE = ZoneId.of("Asia/Colombo");
    private static final int WEATHER_STALE_DAYS = 14;

    private final RoutingDataLoader dataLoader;
    private final OriginCatalog origins;
    private final ForecastClient forecastClient;
    private final MlMetricsClient metricsClient;
    private final ProfitMarginCalculator calculator;
    private final RoutingDecisionService decisions;
    private final Clock clock;

    @Autowired
    public ArbitrageRoutingService(
            RoutingDataLoader dataLoader,
            OriginCatalog origins,
            ForecastClient forecastClient,
            MlMetricsClient metricsClient,
            ProfitMarginCalculator calculator,
            RoutingDecisionService decisions,
            Clock clock
    ) {
        this.dataLoader = dataLoader;
        this.origins = origins;
        this.forecastClient = forecastClient;
        this.metricsClient = metricsClient;
        this.calculator = calculator;
        this.decisions = decisions;
        this.clock = clock;
    }

    public ArbitrageRoutingService(
            CropRepository crops,
            MarketRouteRepository routes,
            FuelPriceRepository fuelPrices,
            WeatherObservationRepository weather,
            OriginCatalog origins,
            ForecastClient forecastClient,
            MlMetricsClient metricsClient,
            ProfitMarginCalculator calculator,
            RoutingDecisionService decisions,
            AtieProperties properties
    ) {
        this(
                new RoutingDataLoader(crops, routes, fuelPrices, weather),
                origins,
                forecastClient,
                metricsClient,
                calculator,
                decisions,
                Clock.systemUTC()
        );
    }

    public AnalyzeResponse analyze(AnalyzeRequest request) {
        if (request == null) {
            throw new DomainValidationException("INVALID_REQUEST", "Request body is required");
        }
        String originCode = normalize(request.originCode());
        String cropCode = normalize(request.cropCode());
        String defaultMarketCode = normalize(request.defaultMarketCode());
        if (request.horizonHours() == null || !Set.of(48, 72).contains(request.horizonHours())) {
            throw new DomainValidationException("INVALID_HORIZON", "horizonHours must be 48 or 72");
        }
        if (request.quantityKg() == null || request.quantityKg().compareTo(BigDecimal.ONE) < 0) {
            throw new DomainValidationException("INVALID_QUANTITY", "quantity_kg must be at least 1.0");
        }
        if (request.vehicleType() == null) {
            throw new DomainValidationException("INVALID_VEHICLE", "vehicle_type is required");
        }
        if (request.demoRequested()) {
            validateCanonicalDemo(request, originCode, cropCode, defaultMarketCode);
        }
        Origin origin = origins.find(originCode).orElseThrow(
                () -> new DomainValidationException("UNKNOWN_ORIGIN", "Unknown origin: " + originCode)
        );
        RoutingDataLoader.RoutingInputs inputs = dataLoader.loadRoutingInputs(
                origin.code(),
                cropCode,
                defaultMarketCode
        );
        Crop crop = inputs.crop();
        List<MarketRoute> originRoutes = inputs.originRoutes();
        FuelPrice fuel = inputs.fuel();
        List<String> marketCodes = originRoutes.stream()
                .map(route -> route.getDestinationMarket().getCode())
                .toList();
        LocalDate requestedReferenceDate = LocalDate.now(clock.withZone(COLOMBO_ZONE));
        MlServiceClient.MlForecastResponse forecast = forecastClient.predictBatch(
                crop.getCode(),
                request.horizonHours(),
                requestedReferenceDate,
                marketCodes,
                request.demoRequested()
        );
        String expectedSource = request.demoRequested() ? "DEMO_FIXTURE" : null;
        if (expectedSource != null && !expectedSource.equals(forecast.forecastSource())) {
            throw new MlServiceException(
                    HttpStatus.BAD_GATEWAY,
                    "ML_CONTRACT_ERROR",
                    "Demo request did not resolve to the canonical fixture"
            );
        }
        Map<String, MarketForecast> forecasts = forecast.predictions().stream()
                .collect(java.util.stream.Collectors.toMap(
                        MarketForecast::marketCode,
                        item -> item,
                        (first, duplicate) -> {
                            throw new MlServiceException(
                                    HttpStatus.BAD_GATEWAY,
                                    "ML_CONTRACT_ERROR",
                                    "ML service returned duplicate market forecasts"
                            );
                        }
                ));
        List<MarketEvaluation> evaluations = originRoutes.stream()
                .map(route -> evaluate(
                        route,
                        forecasts.get(route.getDestinationMarket().getCode()),
                        crop,
                        fuel,
                        request.quantityKg(),
                        request.vehicleType()
                ))
                .sorted(Comparator
                        .comparing((MarketEvaluation market) -> market.profit().netProfitLkr())
                        .reversed()
                        .thenComparing(MarketEvaluation::marketCode))
                .toList();
        MarketEvaluation defaultMarket = evaluations.stream()
                .filter(market -> market.marketCode().equals(defaultMarketCode))
                .findFirst()
                .orElseThrow();
        evaluations = evaluations.stream()
                .map(market -> new MarketEvaluation(
                        market.marketCode(),
                        market.marketName(),
                        market.currentPriceLkr(),
                        market.predictedPriceLkr(),
                        market.profit(),
                        market.distanceKm(),
                        calculator.relativeUpliftPct(
                                market.profit().netProfitLkr(),
                                defaultMarket.profit().netProfitLkr()
                        ),
                        market.pctChange(),
                        market.direction(),
                        market.glutRiskLevel(),
                        market.confidenceScore(),
                        market.primaryDriver()
                ))
                .toList();
        RoutingDecisionService.Decision decision = decisions.decide(
                defaultMarketCode,
                evaluations
        );
        String recommendedMarketCode = decision.recommendedMarketCode();
        MarketEvaluation finalDefaultMarket = defaultMarket;
        List<MarketComparison> comparisons = evaluations.stream()
                .map(market -> new MarketComparison(
                        market.marketCode(),
                        market.marketName(),
                        calculator.displayMoney(market.currentPriceLkr()),
                        calculator.displayMoney(market.predictedPriceLkr()),
                        displayPercentage(market.pctChange()),
                        calculator.displayMoney(market.profit().effectiveVolumeKg()),
                        calculator.displayMoney(market.profit().grossRevenueLkr()),
                        calculator.displayMoney(market.profit().transportCostLkr()),
                        calculator.displayMoney(market.profit().spoilageLossLkr()),
                        calculator.displayMoney(market.profit().handlingCostLkr()),
                        calculator.displayMoney(market.profit().netProfitLkr()),
                        calculator.displayMoney(market.distanceKm()),
                        calculator.displayMoney(
                                market.profit().netProfitLkr().subtract(
                                        finalDefaultMarket.profit().netProfitLkr()
                                )
                        ),
                        displayPercentage(market.profitUpliftPct()),
                        calculator.displayMoney(market.profit().fuelLitres()),
                        market.profit().trips().intValueExact(),
                        calculator.displayMoney(request.vehicleType().getCapacityKg()),
                        market.marketCode().equals(recommendedMarketCode),
                        market.direction(),
                        market.glutRiskLevel(),
                        displayPercentage(market.confidenceScore()),
                        market.primaryDriver()
                ))
                .toList();
        LocalDate weatherBaseDate = request.demoRequested()
                || forecast.referenceDate().isAfter(requestedReferenceDate)
                ? forecast.referenceDate()
                : requestedReferenceDate;
        LocalDate targetWeatherDate = weatherBaseDate
                .plusDays(request.horizonHours() / 24L);
        LocalDate earliestWeatherDate = weatherBaseDate.minusDays(WEATHER_STALE_DAYS);
        Map<String, WeatherObservation> weatherByMarket = loadWeatherByMarket(
                marketCodes,
                targetWeatherDate,
                earliestWeatherDate
        );
        List<WeatherAlert> alerts = comparisons.stream()
                .map(comparison -> weatherAlert(
                        comparison.marketCode(),
                        weatherByMarket.get(comparison.marketCode())
                ))
                .flatMap(Optional::stream)
                .toList();
        return new AnalyzeResponse(
                forecast.forecastSource(),
                forecast.inputDataState(),
                forecast.modelVersion(),
                forecast.referenceDate(),
                decision.primaryDirective(),
                comparisons,
                alerts,
                metricsClient.fetchSummary(request.horizonHours())
        );
    }

    private MarketEvaluation evaluate(
            MarketRoute route,
            MarketForecast forecast,
            Crop crop,
            FuelPrice fuel,
            BigDecimal quantityKg,
            VehicleType vehicleType
    ) {
        if (forecast == null) {
            throw new MlServiceException(
                    HttpStatus.BAD_GATEWAY,
                    "ML_CONTRACT_ERROR",
                    "Forecast missing for market: "
                            + route.getDestinationMarket().getCode()
            );
        }
        Market market = route.getDestinationMarket();
        BigDecimal fuelPrice = vehicleType.getFuelType() == VehicleType.FuelType.DIESEL
                ? fuel.getDieselLkrPerLiter()
                : fuel.getPetrolLkrPerLiter();
        ProfitBreakdown profit = calculator.calculate(
                forecast.predictedPriceLkr(),
                quantityKg,
                route.getDistanceKm(),
                route.getRoadTerrainFactor(),
                fuelPrice,
                market.getHandlingFeePerKgLkr(),
                crop.getSpoilageRatePer100KmPct(),
                vehicleType
        );
        return new MarketEvaluation(
                market.getCode(),
                market.getName(),
                forecast.currentPriceLkr(),
                forecast.predictedPriceLkr(),
                profit,
                route.getDistanceKm(),
                null,
                forecast.pctChange(),
                forecast.direction(),
                forecast.glutRiskLevel(),
                forecast.confidenceScore(),
                forecast.primaryDriver()
        );
    }

    private BigDecimal displayPercentage(BigDecimal value) {
        return value == null ? null : calculator.displayPercentage(value);
    }

    private Map<String, WeatherObservation> loadWeatherByMarket(
            List<String> marketCodes,
            LocalDate targetWeatherDate,
            LocalDate earliestWeatherDate
    ) {
        List<WeatherObservation> rows = dataLoader.loadLatestWeather(
                marketCodes,
                targetWeatherDate
        );
        if (rows == null || rows.isEmpty()) {
            return Map.of();
        }
        Map<String, WeatherObservation> byMarket = new java.util.LinkedHashMap<>();
        for (WeatherObservation observation : rows) {
            if (observation.getMarket() == null
                    || observation.getMarket().getCode() == null) {
                continue;
            }
            LocalDate observedAt = observation.getObservationDate();
            if (observedAt != null && observedAt.isBefore(earliestWeatherDate)) {
                continue;
            }
            byMarket.putIfAbsent(observation.getMarket().getCode(), observation);
        }
        return byMarket;
    }

    private Optional<WeatherAlert> weatherAlert(
            String marketCode,
            WeatherObservation observation
    ) {
        return Optional.ofNullable(observation)
                .map(item -> {
                    BigDecimal rain = item.getPrecipitationMm() != null
                            ? item.getPrecipitationMm()
                            : BigDecimal.ZERO;
                    boolean extreme = item.isExtremeWeatherFlag();
                    String risk = extreme || rain.compareTo(new BigDecimal("15")) >= 0
                            ? "HIGH"
                            : rain.compareTo(new BigDecimal("8")) >= 0
                            ? "MEDIUM"
                            : "LOW";
                    String message = "HIGH".equals(risk)
                            ? (extreme && rain.compareTo(new BigDecimal("15")) < 0
                                    ? "Extreme weather advisory may disrupt supply routes and increase spoilage risk."
                                    : "Heavy rainfall may disrupt supply routes and increase spoilage risk.")
                            : "MEDIUM".equals(risk)
                            ? "Moderate rainfall may slow arrivals and transit."
                            : "Weather conditions are currently favourable.";
                    return new WeatherAlert(
                            marketCode,
                            risk,
                            message,
                            calculator.displayMoney(rain),
                            extreme,
                            item.getSource(),
                            item.getObservationDate()
                    );
                });
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private void validateCanonicalDemo(
            AnalyzeRequest request,
            String originCode,
            String cropCode,
            String defaultMarketCode
    ) {
        boolean matches = "ANURADHAPURA".equals(originCode)
                && "DAMBULLA".equals(defaultMarketCode)
                && "TOMATO".equals(cropCode)
                && request.quantityKg() != null
                && request.quantityKg().compareTo(new BigDecimal("1000")) == 0
                && request.vehicleType() == VehicleType.MINI_TRUCK_BATTA;
        if (!matches) {
            throw new DomainValidationException(
                    "DEMO_FIXTURE_MISMATCH",
                    "demo_mode only supports the registered Anuradhapura tomato fixture"
            );
        }
    }
}

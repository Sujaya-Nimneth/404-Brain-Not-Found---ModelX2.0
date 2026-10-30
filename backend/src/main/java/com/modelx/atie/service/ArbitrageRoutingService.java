package com.modelx.atie.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.modelx.atie.client.ForecastClient;
import com.modelx.atie.client.MlServiceClient;
import com.modelx.atie.client.MlMetricsClient;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.config.OriginCatalog;
import com.modelx.atie.domain.Origin;
import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.dto.AnalyzeRequest;
import com.modelx.atie.dto.AnalyzeResponse;
import com.modelx.atie.dto.MarketComparison;
import com.modelx.atie.dto.MarketForecast;
import com.modelx.atie.dto.ModelEvaluationSummary;
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
    private final CropRepository crops;
    private final MarketRouteRepository routes;
    private final FuelPriceRepository fuelPrices;
    private final WeatherObservationRepository weather;
    private final OriginCatalog origins;
    private final ForecastClient forecastClient;
    private final MlMetricsClient metricsClient;
    private final ProfitMarginCalculator calculator;
    private final RoutingDecisionService decisions;
    private final AtieProperties properties;

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
        this.crops = crops;
        this.routes = routes;
        this.fuelPrices = fuelPrices;
        this.weather = weather;
        this.origins = origins;
        this.forecastClient = forecastClient;
        this.metricsClient = metricsClient;
        this.calculator = calculator;
        this.decisions = decisions;
        this.properties = properties;
    }

    public AnalyzeResponse analyze(AnalyzeRequest request) {
        String originCode = normalize(request.originCode());
        String cropCode = normalize(request.cropCode());
        String defaultMarketCode = normalize(request.defaultMarketCode());
        if (!Set.of(48, 72).contains(request.horizonHours())) {
            throw new IllegalArgumentException("horizonHours must be 48 or 72");
        }
        if (request.demoRequested()) {
            validateCanonicalDemo(request, originCode, cropCode, defaultMarketCode);
        }
        Origin origin = origins.find(originCode).orElseThrow(
                () -> new IllegalArgumentException("Unknown origin: " + originCode)
        );
        Crop crop = crops.findByCode(cropCode).orElseThrow(
                () -> new IllegalArgumentException("Unknown crop: " + cropCode)
        );
        List<MarketRoute> originRoutes = routes.findByOriginCodeOrderByDistanceKmAsc(
                origin.code()
        );
        if (originRoutes.isEmpty()) {
            throw new IllegalArgumentException(
                    "No routes configured for origin: " + origin.code()
            );
        }
        boolean hasDefault = originRoutes.stream().anyMatch(
                route -> route.getDestinationMarket().getCode().equals(defaultMarketCode)
        );
        if (!hasDefault) {
            throw new IllegalArgumentException(
                    "Default market is not reachable from origin: " + defaultMarketCode
            );
        }
        FuelPrice fuel = fuelPrices.findTopByOrderByEffectiveDateDesc().orElseThrow(
                () -> new IllegalArgumentException("Fuel prices are unavailable")
        );
        List<String> marketCodes = originRoutes.stream()
                .map(route -> route.getDestinationMarket().getCode())
                .toList();
        LocalDate requestedReferenceDate = LocalDate.now(ZoneId.of("Asia/Colombo"));
        MlServiceClient.MlForecastResponse forecast = forecastClient.predictBatch(
                crop.getCode(),
                request.horizonHours(),
                requestedReferenceDate,
                marketCodes,
                request.demoRequested()
        );
        String expectedSource = request.demoRequested() ? "DEMO_FIXTURE" : null;
        if (expectedSource != null && !expectedSource.equals(forecast.forecastSource())) {
            throw new IllegalArgumentException(
                    "Demo request did not resolve to the canonical fixture"
            );
        }
        Map<String, MarketForecast> forecasts = forecast.predictions().stream()
                .collect(java.util.stream.Collectors.toMap(
                        MarketForecast::marketCode,
                        item -> item,
                        (first, duplicate) -> {
                            throw new IllegalArgumentException(
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
                .sorted(Comparator.comparing(
                        (MarketEvaluation market) -> market.profit().netProfitLkr()
                ).reversed())
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
                        market.direction()
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
                        market.direction()
                ))
                .toList();
        List<WeatherAlert> alerts = comparisons.stream()
                .map(comparison -> weatherAlert(comparison.marketCode()))
                .flatMap(Optional::stream)
                .toList();
        return new AnalyzeResponse(
                forecast.forecastSource(),
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
            throw new IllegalArgumentException(
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
                forecast.direction()
        );
    }

    private BigDecimal displayPercentage(BigDecimal value) {
        return value == null ? null : calculator.displayPercentage(value);
    }

    private Optional<WeatherAlert> weatherAlert(String marketCode) {
        return weather.findTopByMarketCodeOrderByObservationDateDesc(marketCode)
                .map(observation -> {
                    BigDecimal rain = observation.getPrecipitationMm();
                    String risk = rain.compareTo(new BigDecimal("15")) >= 0
                            ? "HIGH"
                            : rain.compareTo(new BigDecimal("8")) >= 0
                            ? "MEDIUM"
                            : "LOW";
                    String message = "HIGH".equals(risk)
                            ? "Heavy rainfall may disrupt supply routes and increase spoilage risk."
                            : "MEDIUM".equals(risk)
                            ? "Moderate rainfall may slow arrivals and transit."
                            : "Weather conditions are currently favourable.";
                    return new WeatherAlert(
                            marketCode,
                            risk,
                            message,
                            rain,
                            observation.isExtremeWeatherFlag(),
                            observation.getSource(),
                            observation.getObservationDate()
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
            throw new IllegalArgumentException(
                    "demo_mode only supports the registered Anuradhapura tomato fixture"
            );
        }
    }
}

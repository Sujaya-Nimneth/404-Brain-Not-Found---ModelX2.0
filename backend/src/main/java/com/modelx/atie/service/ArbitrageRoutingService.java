package com.modelx.atie.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
        LocalDate referenceDate = LocalDate.now();
        MlServiceClient.MlForecastResponse forecast = forecastClient.predictBatch(
                crop.getCode(),
                request.horizonHours(),
                referenceDate,
                marketCodes
        );
        Map<String, MarketForecast> forecasts = forecast.predictions().stream()
                .collect(java.util.stream.Collectors.toMap(
                        MarketForecast::marketCode,
                        item -> item
                ));
        List<MarketComparison> comparisons = originRoutes.stream()
                .map(route -> compare(
                        route,
                        forecasts.get(route.getDestinationMarket().getCode()),
                        crop,
                        fuel,
                        request.quantityKg(),
                        request.vehicleType(),
                        defaultMarketCode
                ))
                .sorted(Comparator.comparing(MarketComparison::netProfitLkr).reversed())
                .toList();
        MarketComparison defaultMarket = comparisons.stream()
                .filter(market -> market.marketCode().equals(defaultMarketCode))
                .findFirst()
                .orElseThrow();
        comparisons = comparisons.stream()
                .map(market -> new MarketComparison(
                        market.marketCode(),
                        market.marketName(),
                        market.currentPriceLkr(),
                        market.predictedPriceLkr(),
                        market.grossRevenueLkr(),
                        market.transportCostLkr(),
                        market.spoilageLossLkr(),
                        market.handlingCostLkr(),
                        market.netProfitLkr(),
                        market.distanceKm(),
                        calculator.relativeUpliftPct(
                                market.netProfitLkr(),
                                defaultMarket.netProfitLkr()
                        ),
                        false,
                        market.direction()
                ))
                .toList();
        RoutingDecisionService.Decision decision = decisions.decide(
                defaultMarketCode,
                comparisons
        );
        String recommendedMarketCode = decision.recommendedMarketCode();
        comparisons = comparisons.stream()
                .map(market -> new MarketComparison(
                        market.marketCode(),
                        market.marketName(),
                        market.currentPriceLkr(),
                        market.predictedPriceLkr(),
                        market.grossRevenueLkr(),
                        market.transportCostLkr(),
                        market.spoilageLossLkr(),
                        market.handlingCostLkr(),
                        market.netProfitLkr(),
                        market.distanceKm(),
                        market.profitUpliftPct(),
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
                referenceDate,
                decision.primaryDirective(),
                comparisons,
                alerts,
                metricsClient.fetchSummary(request.horizonHours())
        );
    }

    private MarketComparison compare(
            MarketRoute route,
            MarketForecast forecast,
            Crop crop,
            FuelPrice fuel,
            BigDecimal quantityKg,
            VehicleType vehicleType,
            String defaultMarketCode
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
        return new MarketComparison(
                market.getCode(),
                market.getName(),
                forecast.currentPriceLkr(),
                forecast.predictedPriceLkr(),
                profit.grossRevenueLkr(),
                profit.transportCostLkr(),
                profit.spoilageLossLkr(),
                profit.handlingCostLkr(),
                profit.netProfitLkr(),
                route.getDistanceKm(),
                null,
                false,
                forecast.direction()
        );
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
                            observation.isExtremeWeatherFlag()
                    );
                });
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }
}

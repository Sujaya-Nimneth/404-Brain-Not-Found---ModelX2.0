package com.modelx.atie.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.modelx.atie.client.MlServiceException;
import com.modelx.atie.entity.Crop;
import com.modelx.atie.entity.FuelPrice;
import com.modelx.atie.entity.MarketRoute;
import com.modelx.atie.entity.WeatherObservation;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.FuelPriceRepository;
import com.modelx.atie.repository.MarketRouteRepository;
import com.modelx.atie.repository.WeatherObservationRepository;

@Service
public class RoutingDataLoader {
    private final CropRepository crops;
    private final MarketRouteRepository routes;
    private final FuelPriceRepository fuelPrices;
    private final WeatherObservationRepository weather;

    public RoutingDataLoader(
            CropRepository crops,
            MarketRouteRepository routes,
            FuelPriceRepository fuelPrices,
            WeatherObservationRepository weather
    ) {
        this.crops = crops;
        this.routes = routes;
        this.fuelPrices = fuelPrices;
        this.weather = weather;
    }

    @Transactional(readOnly = true)
    public RoutingInputs loadInputs(String originCode, String cropCode, String defaultMarketCode) {
        Crop crop = crops.findByCode(cropCode).orElseThrow(
                () -> new DomainValidationException("UNKNOWN_CROP", "Unknown crop: " + cropCode)
        );
        List<MarketRoute> originRoutes = routes.findByOriginCodeOrderByDistanceKmAsc(originCode);
        if (originRoutes.isEmpty()) {
            throw new DomainValidationException(
                    "ROUTE_NOT_FOUND",
                    "No routes configured for origin: " + originCode
            );
        }
        boolean hasDefault = originRoutes.stream().anyMatch(
                route -> route.getDestinationMarket().getCode().equals(defaultMarketCode)
        );
        if (!hasDefault) {
            throw new DomainValidationException(
                    "ROUTE_NOT_FOUND",
                    "Default market is not reachable from origin: " + defaultMarketCode
            );
        }
        FuelPrice fuel = fuelPrices.findTopByOrderByEffectiveDateDesc().orElseThrow(
                () -> new MlServiceException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "FUEL_PRICES_UNAVAILABLE",
                        "Fuel prices are unavailable"
                )
        );
        // Eagerly touch lazy destinationMarket attributes inside the read-only transaction.
        originRoutes.forEach(route -> {
            route.getDestinationMarket().getCode();
            route.getDestinationMarket().getName();
            route.getDestinationMarket().getHandlingFeePerKgLkr();
        });
        return new RoutingInputs(crop, originRoutes, fuel);
    }

    @Transactional(readOnly = true)
    public Map<String, WeatherObservation> loadWeatherByMarket(
            List<String> marketCodes,
            LocalDate targetWeatherDate,
            LocalDate minObservationDate
    ) {
        List<WeatherObservation> rows = weather.findLatestByMarketCodesOnOrBefore(
                marketCodes,
                targetWeatherDate
        );
        if (rows == null || rows.isEmpty()) {
            return Map.of();
        }
        Map<String, WeatherObservation> byMarket = new java.util.LinkedHashMap<>();
        for (WeatherObservation observation : rows) {
            if (observation.getMarket() == null
                    || observation.getMarket().getCode() == null
                    || observation.getObservationDate() == null
                    || observation.getObservationDate().isBefore(minObservationDate)) {
                continue;
            }
            byMarket.putIfAbsent(observation.getMarket().getCode(), observation);
        }
        return byMarket;
    }

    public record RoutingInputs(Crop crop, List<MarketRoute> routes, FuelPrice fuel) {
    }
}

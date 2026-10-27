package com.modelx.atie.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.config.OriginCatalog;
import com.modelx.atie.domain.Origin;
import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.entity.Crop;
import com.modelx.atie.entity.FuelPrice;
import com.modelx.atie.entity.Market;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.FuelPriceRepository;
import com.modelx.atie.repository.MarketRepository;
import com.modelx.atie.repository.MarketRouteRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/metadata")
@Tag(name = "Metadata", description = "Onboarding and scenario configuration")
public class MetadataController {
    private final MarketRepository markets;
    private final CropRepository crops;
    private final FuelPriceRepository fuelPrices;
    private final MarketRouteRepository routes;
    private final OriginCatalog origins;
    private final AtieProperties properties;

    public MetadataController(
            MarketRepository markets,
            CropRepository crops,
            FuelPriceRepository fuelPrices,
            MarketRouteRepository routes,
            OriginCatalog origins,
            AtieProperties properties
    ) {
        this.markets = markets;
        this.crops = crops;
        this.fuelPrices = fuelPrices;
        this.routes = routes;
        this.origins = origins;
        this.properties = properties;
    }

    @GetMapping("/config")
    @Operation(summary = "Get supported crops, origins, markets, vehicles, and fuel prices")
    public Map<String, Object> config() {
        FuelPrice fuel = fuelPrices.findTopByOrderByEffectiveDateDesc().orElse(null);
        return Map.of(
                "origins", origins.all(),
                "markets", markets.findAllByOrderByNameAsc(),
                "crops", crops.findAllByOrderByNameAsc(),
                "routes", routes.findAll().stream().map(route -> Map.of(
                        "originCode", route.getOriginCode(),
                        "marketCode", route.getDestinationMarket().getCode(),
                        "distanceKm", route.getDistanceKm(),
                        "terrainFactor", route.getRoadTerrainFactor()
                )).toList(),
                "vehicleTypes", List.of(
                        vehicle(VehicleType.THREE_WHEELER),
                        vehicle(VehicleType.MINI_TRUCK_BATTA),
                        vehicle(VehicleType.LORRY_3_5T)
                ),
                "horizons", List.of(48, 72),
                "fuelPrices", fuel == null ? Map.of() : Map.of(
                        "effectiveDate", fuel.getEffectiveDate(),
                        "dieselLkrPerLiter", fuel.getDieselLkrPerLiter(),
                        "petrolLkrPerLiter", fuel.getPetrolLkrPerLiter()
                ),
                "thresholds", Map.of(
                        "safeMarginPct", properties.safeMarginPct(),
                        "safeAbsoluteFloorLkr", properties.safeAbsoluteFloorLkr(),
                        "movementThresholdPct", properties.movementThresholdPct()
                )
        );
    }

    private Map<String, Object> vehicle(VehicleType vehicle) {
        return Map.of(
                "code", vehicle.name(),
                "displayName", vehicle.getDisplayName(),
                "capacityKg", vehicle.getCapacityKg(),
                "litresPerKm", vehicle.getLitresPerKm(),
                "fuelType", vehicle.getFuelType()
        );
    }
}

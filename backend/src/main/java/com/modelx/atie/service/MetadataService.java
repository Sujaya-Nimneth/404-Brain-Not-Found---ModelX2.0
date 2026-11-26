package com.modelx.atie.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.config.OriginCatalog;
import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.dto.MetadataConfigResponse;
import com.modelx.atie.entity.FuelPrice;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.FuelPriceRepository;
import com.modelx.atie.repository.MarketRepository;
import com.modelx.atie.repository.MarketRouteRepository;

@Service
public class MetadataService {
    private final MarketRepository markets;
    private final CropRepository crops;
    private final FuelPriceRepository fuelPrices;
    private final MarketRouteRepository routes;
    private final OriginCatalog origins;
    private final AtieProperties properties;

    public MetadataService(
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

    @Transactional(readOnly = true)
    public MetadataConfigResponse loadConfig() {
        FuelPrice fuel = fuelPrices.findTopByOrderByEffectiveDateDesc().orElse(null);
        return new MetadataConfigResponse(
                origins.all(),
                markets.findAllByOrderByNameAsc().stream()
                        .map(market -> new MetadataConfigResponse.MarketInfo(
                                market.getCode(),
                                market.getName(),
                                market.getProvince(),
                                market.getLatitude(),
                                market.getLongitude(),
                                market.getHandlingFeePerKgLkr()
                        ))
                        .toList(),
                crops.findAllByOrderByNameAsc().stream()
                        .map(crop -> new MetadataConfigResponse.CropInfo(
                                crop.getCode(),
                                crop.getName(),
                                crop.getSpoilageRatePer100KmPct()
                        ))
                        .toList(),
                routes.findAll(Sort.by("originCode", "distanceKm")).stream()
                        .map(route -> new MetadataConfigResponse.RouteInfo(
                                route.getOriginCode(),
                                route.getDestinationMarket().getCode(),
                                route.getDistanceKm(),
                                route.getRoadTerrainFactor()
                        ))
                        .toList(),
                List.of(
                        vehicle(VehicleType.THREE_WHEELER),
                        vehicle(VehicleType.MINI_TRUCK_BATTA),
                        vehicle(VehicleType.LORRY_3_5T)
                ),
                List.of(48, 72),
                fuel == null ? null : new MetadataConfigResponse.FuelPrices(
                        fuel.getEffectiveDate(),
                        fuel.getDieselLkrPerLiter(),
                        fuel.getPetrolLkrPerLiter()
                ),
                new MetadataConfigResponse.Thresholds(
                        properties.safeMarginPct(),
                        properties.safeAbsoluteFloorLkr(),
                        properties.movementThresholdPct()
                )
        );
    }

    private MetadataConfigResponse.VehicleInfo vehicle(VehicleType vehicle) {
        return new MetadataConfigResponse.VehicleInfo(
                vehicle.name(),
                vehicle.getDisplayName(),
                vehicle.getCapacityKg(),
                vehicle.getLitresPerKm(),
                vehicle.getFuelType().name()
        );
    }
}

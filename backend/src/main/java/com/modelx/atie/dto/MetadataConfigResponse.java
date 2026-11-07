package com.modelx.atie.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.modelx.atie.domain.Origin;

public record MetadataConfigResponse(
        List<Origin> origins,
        List<MarketInfo> markets,
        List<CropInfo> crops,
        List<RouteInfo> routes,
        List<VehicleInfo> vehicleTypes,
        List<Integer> horizons,
        FuelPrices fuelPrices,
        Thresholds thresholds
) {
    public record MarketInfo(
            String code,
            String name,
            String province,
            BigDecimal latitude,
            BigDecimal longitude,
            BigDecimal handlingFeePerKgLkr
    ) {
    }

    public record CropInfo(
            String code,
            String name,
            @JsonProperty("spoilage_rate_per_100km_pct")
            BigDecimal spoilageRatePer100KmPct
    ) {
    }

    public record RouteInfo(
            String originCode,
            String marketCode,
            BigDecimal distanceKm,
            BigDecimal terrainFactor
    ) {
    }

    public record VehicleInfo(
            String code,
            String displayName,
            BigDecimal capacityKg,
            BigDecimal litresPerKm,
            String fuelType
    ) {
    }

    public record FuelPrices(
            LocalDate effectiveDate,
            BigDecimal dieselLkrPerLiter,
            BigDecimal petrolLkrPerLiter
    ) {
    }

    public record Thresholds(
            BigDecimal safeMarginPct,
            BigDecimal safeAbsoluteFloorLkr,
            BigDecimal movementThresholdPct
    ) {
    }
}

package com.modelx.atie.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MarketComparison(
        String marketCode,
        String marketName,
        BigDecimal currentPriceLkr,
        BigDecimal predictedPriceLkr,
        BigDecimal grossRevenueLkr,
        BigDecimal transportCostLkr,
        BigDecimal spoilageLossLkr,
        BigDecimal handlingCostLkr,
        BigDecimal netProfitLkr,
        BigDecimal distanceKm,
        BigDecimal profitDeltaLkr,
        BigDecimal profitUpliftPct,
        BigDecimal fuelLitres,
        int trips,
        BigDecimal vehicleCapacityKg,
        @JsonProperty("is_recommended") boolean recommended,
        String direction
) {
}

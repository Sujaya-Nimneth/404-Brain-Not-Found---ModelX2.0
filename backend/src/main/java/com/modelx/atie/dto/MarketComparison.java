package com.modelx.atie.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MarketComparison(
        String marketCode,
        String marketName,
        BigDecimal currentPriceLkr,
        BigDecimal predictedPriceLkr,
        BigDecimal pctChange,
        BigDecimal effectiveVolumeKg,
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
        String direction,
        String glutRiskLevel,
        BigDecimal confidenceScore,
        String primaryDriver
) {
    public MarketComparison(
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
            boolean recommended,
            String direction
    ) {
        this(
                marketCode,
                marketName,
                currentPriceLkr,
                predictedPriceLkr,
                null,
                null,
                grossRevenueLkr,
                transportCostLkr,
                spoilageLossLkr,
                handlingCostLkr,
                netProfitLkr,
                distanceKm,
                profitDeltaLkr,
                profitUpliftPct,
                fuelLitres,
                trips,
                vehicleCapacityKg,
                recommended,
                direction,
                null,
                null,
                null
        );
    }
}

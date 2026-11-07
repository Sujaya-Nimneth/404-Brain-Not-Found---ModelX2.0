package com.modelx.atie.service;

import java.math.BigDecimal;

import com.modelx.atie.dto.ProfitBreakdown;

public record MarketEvaluation(
        String marketCode,
        String marketName,
        BigDecimal currentPriceLkr,
        BigDecimal predictedPriceLkr,
        ProfitBreakdown profit,
        BigDecimal distanceKm,
        BigDecimal profitUpliftPct,
        BigDecimal pctChange,
        String direction,
        String glutRiskLevel,
        BigDecimal confidenceScore,
        String primaryDriver
) {
    public MarketEvaluation(
            String marketCode,
            String marketName,
            BigDecimal currentPriceLkr,
            BigDecimal predictedPriceLkr,
            ProfitBreakdown profit,
            BigDecimal distanceKm,
            BigDecimal profitUpliftPct,
            String direction
    ) {
        this(
                marketCode,
                marketName,
                currentPriceLkr,
                predictedPriceLkr,
                profit,
                distanceKm,
                profitUpliftPct,
                null,
                direction,
                null,
                null,
                null
        );
    }
}

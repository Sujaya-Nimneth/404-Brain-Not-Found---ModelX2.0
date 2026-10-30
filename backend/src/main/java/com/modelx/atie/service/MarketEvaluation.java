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
        String direction
) {
}

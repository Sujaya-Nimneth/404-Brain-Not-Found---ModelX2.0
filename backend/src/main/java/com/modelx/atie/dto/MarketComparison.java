package com.modelx.atie.dto;

import java.math.BigDecimal;

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
        BigDecimal profitUpliftPct,
        boolean recommended,
        String direction
) {
}

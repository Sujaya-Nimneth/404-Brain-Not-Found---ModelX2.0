package com.modelx.atie.dto;

import java.math.BigDecimal;

public record MarketForecast(
        String marketCode,
        BigDecimal currentPriceLkr,
        BigDecimal predictedPriceLkr,
        BigDecimal baselineNaiveLkr,
        BigDecimal baselineMa7Lkr,
        BigDecimal pctChange,
        String direction,
        String glutRiskLevel,
        BigDecimal confidenceScore,
        String primaryDriver
) {
}

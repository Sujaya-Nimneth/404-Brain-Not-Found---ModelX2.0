package com.modelx.atie.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MarketForecast(
        @JsonProperty("market_code")
        String marketCode,
        @JsonProperty("current_price_lkr")
        BigDecimal currentPriceLkr,
        @JsonProperty("predicted_price_lkr")
        BigDecimal predictedPriceLkr,
        @JsonProperty("baseline_naive_lkr")
        BigDecimal baselineNaiveLkr,
        @JsonProperty("baseline_ma7_lkr")
        BigDecimal baselineMa7Lkr,
        @JsonProperty("pct_change")
        BigDecimal pctChange,
        @JsonProperty("direction")
        String direction,
        @JsonProperty("glut_risk_level")
        String glutRiskLevel,
        @JsonProperty("confidence_score")
        BigDecimal confidenceScore,
        @JsonProperty("primary_driver")
        String primaryDriver
) {
}

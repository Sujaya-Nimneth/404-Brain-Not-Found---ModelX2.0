package com.modelx.atie.dto;

import java.math.BigDecimal;

public record PrimaryDirective(
        String severity,
        String headline,
        String explanation,
        String defaultMarketCode,
        String recommendedMarketCode,
        BigDecimal profitDeltaLkr,
        BigDecimal profitUpliftPct
) {
}

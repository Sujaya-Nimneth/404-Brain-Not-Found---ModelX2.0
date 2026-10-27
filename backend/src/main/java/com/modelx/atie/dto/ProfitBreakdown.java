package com.modelx.atie.dto;

import java.math.BigDecimal;

public record ProfitBreakdown(
        BigDecimal effectiveVolumeKg,
        BigDecimal spoilageLossLkr,
        BigDecimal grossRevenueLkr,
        BigDecimal transportCostLkr,
        BigDecimal handlingCostLkr,
        BigDecimal netProfitLkr
) {
}

package com.modelx.atie.dto;

import java.math.BigDecimal;

public record ModelEvaluationSummary(
        BigDecimal modelDirectionalSymmetryPct,
        BigDecimal modelMaeLkr,
        BigDecimal naiveDirectionalSymmetryPct,
        BigDecimal naiveMaeLkr,
        BigDecimal ma7DirectionalSymmetryPct,
        BigDecimal ma7MaeLkr,
        BigDecimal safeMarginFprPct
) {
}

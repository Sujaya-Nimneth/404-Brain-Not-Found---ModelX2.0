package com.modelx.atie.dto;

import java.math.BigDecimal;

public record ModelEvaluationSummary(
        boolean available,
        String message,
        BigDecimal modelDirectionalSymmetryPct,
        BigDecimal modelMaeLkr,
        SafeMarginFpr modelSafeMarginFpr,
        BigDecimal naiveDirectionalSymmetryPct,
        BigDecimal naiveMaeLkr,
        SafeMarginFpr naiveSafeMarginFpr,
        BigDecimal ma7DirectionalSymmetryPct,
        BigDecimal ma7MaeLkr,
        SafeMarginFpr ma7SafeMarginFpr
) {
    public record SafeMarginFpr(
            BigDecimal safeMarginFprPct,
            int rerouteCount,
            int falseRerouteCount
    ) {
    }

    public static ModelEvaluationSummary unavailable(String message) {
        return new ModelEvaluationSummary(
                false,
                message,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}

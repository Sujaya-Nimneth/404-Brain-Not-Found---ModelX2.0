package com.modelx.atie.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record MarketHistoryResponse(
        String marketCode,
        String marketName,
        String cropCode,
        int days,
        LocalDate referenceDate,
        String forecastSource,
        String modelVersion,
        List<HistoryPoint> history,
        List<ForecastPoint> forecastTrajectory
) {
    public record HistoryPoint(
            LocalDate date,
            BigDecimal priceLkrPerKg,
            BigDecimal arrivalVolumeTonnes
    ) {
    }

    public record ForecastPoint(
            int horizonHours,
            BigDecimal predictedPriceLkr,
            BigDecimal baselineNaiveLkr,
            BigDecimal baselineMa7Lkr,
            String direction
    ) {
    }
}

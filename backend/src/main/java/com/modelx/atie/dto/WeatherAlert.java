package com.modelx.atie.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeatherAlert(
        String marketCode,
        String riskLevel,
        String message,
        BigDecimal precipitationMm,
        boolean extremeWeather,
        String source,
        LocalDate observationDate
) {
}

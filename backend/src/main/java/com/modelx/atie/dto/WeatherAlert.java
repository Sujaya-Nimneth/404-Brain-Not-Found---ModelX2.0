package com.modelx.atie.dto;

import java.math.BigDecimal;

public record WeatherAlert(
        String marketCode,
        String riskLevel,
        String message,
        BigDecimal precipitationMm,
        boolean extremeWeather
) {
}

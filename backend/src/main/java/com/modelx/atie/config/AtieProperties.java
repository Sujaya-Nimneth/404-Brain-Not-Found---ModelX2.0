package com.modelx.atie.config;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "atie")
public record AtieProperties(
        String mlServiceUrl,
        BigDecimal safeMarginPct,
        BigDecimal safeAbsoluteFloorLkr,
        BigDecimal movementThresholdPct,
        List<String> corsAllowedOrigins
) {
}

package com.modelx.atie.config;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

@Validated
@ConfigurationProperties(prefix = "atie")
public record AtieProperties(
        @NotBlank String mlServiceUrl,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal safeMarginPct,
        @DecimalMin("0.0") BigDecimal safeAbsoluteFloorLkr,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal movementThresholdPct,
        @NotEmpty List<String> corsAllowedOrigins,
        String apiKey,
        @Min(1) @Max(60) int mlConnectTimeoutSeconds,
        @Min(1) @Max(120) int mlReadTimeoutSeconds
) {
    public AtieProperties(
            String mlServiceUrl,
            BigDecimal safeMarginPct,
            BigDecimal safeAbsoluteFloorLkr,
            BigDecimal movementThresholdPct,
            List<String> corsAllowedOrigins,
            String apiKey
    ) {
        this(
                mlServiceUrl,
                safeMarginPct,
                safeAbsoluteFloorLkr,
                movementThresholdPct,
                corsAllowedOrigins,
                apiKey,
                3,
                15
        );
    }

    public boolean apiKeyRequired() {
        return apiKey != null && !apiKey.isBlank();
    }
}

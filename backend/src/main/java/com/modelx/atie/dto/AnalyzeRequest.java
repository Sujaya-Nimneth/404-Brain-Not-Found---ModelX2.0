package com.modelx.atie.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.modelx.atie.domain.VehicleType;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AnalyzeRequest(
        @NotBlank @JsonProperty("origin_code") String originCode,
        @NotBlank @JsonProperty("default_market_code") String defaultMarketCode,
        @NotBlank @JsonProperty("crop_code") String cropCode,
        @NotNull @DecimalMin("1.0") @DecimalMax("100000.0")
        @JsonProperty("quantity_kg") java.math.BigDecimal quantityKg,
        @NotNull @JsonProperty("vehicle_type") VehicleType vehicleType,
        @NotNull
        @Schema(allowableValues = {"48", "72"}, example = "48")
        @JsonProperty("horizon_hours") Integer horizonHours,
        @JsonProperty("demo_mode") Boolean demoMode
) {
    public boolean demoRequested() {
        return Boolean.TRUE.equals(demoMode);
    }

    @AssertTrue(message = "horizon_hours must be 48 or 72")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public boolean isValidHorizonHours() {
        return horizonHours != null && (horizonHours == 48 || horizonHours == 72);
    }
}

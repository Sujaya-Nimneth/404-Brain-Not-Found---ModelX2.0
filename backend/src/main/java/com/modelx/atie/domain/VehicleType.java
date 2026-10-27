package com.modelx.atie.domain;

import java.math.BigDecimal;

public enum VehicleType {
    THREE_WHEELER(
            "Three-wheeler",
            new BigDecimal("300"),
            new BigDecimal("0.04"),
            FuelType.PETROL
    ),
    MINI_TRUCK_BATTA(
            "Batta mini-truck",
            new BigDecimal("1500"),
            new BigDecimal("0.08"),
            FuelType.DIESEL
    ),
    LORRY_3_5T(
            "3.5 tonne lorry",
            new BigDecimal("3500"),
            new BigDecimal("0.14"),
            FuelType.DIESEL
    );

    private final String displayName;
    private final BigDecimal capacityKg;
    private final BigDecimal litresPerKm;
    private final FuelType fuelType;

    VehicleType(
            String displayName,
            BigDecimal capacityKg,
            BigDecimal litresPerKm,
            FuelType fuelType
    ) {
        this.displayName = displayName;
        this.capacityKg = capacityKg;
        this.litresPerKm = litresPerKm;
        this.fuelType = fuelType;
    }

    public String getDisplayName() {
        return displayName;
    }

    public BigDecimal getCapacityKg() {
        return capacityKg;
    }

    public BigDecimal getLitresPerKm() {
        return litresPerKm;
    }

    public FuelType getFuelType() {
        return fuelType;
    }

    public enum FuelType {
        PETROL,
        DIESEL
    }
}

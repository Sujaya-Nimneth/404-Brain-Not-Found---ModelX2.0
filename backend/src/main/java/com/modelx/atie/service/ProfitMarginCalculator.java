package com.modelx.atie.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

import org.springframework.stereotype.Service;

import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.dto.ProfitBreakdown;

@Service
public class ProfitMarginCalculator {
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final BigDecimal TWO = new BigDecimal("2");

    public ProfitBreakdown calculate(
            BigDecimal predictedPriceLkrPerKg,
            BigDecimal quantityKg,
            BigDecimal distanceKm,
            BigDecimal terrainFactor,
            BigDecimal fuelPriceLkrPerLitre,
            BigDecimal handlingFeePerKgLkr,
            BigDecimal spoilageRatePer100KmPct,
            VehicleType vehicleType
    ) {
        requirePositive(predictedPriceLkrPerKg, "predictedPriceLkrPerKg");
        requirePositive(quantityKg, "quantityKg");
        requirePositive(distanceKm, "distanceKm");
        requirePositive(terrainFactor, "terrainFactor");
        requirePositive(fuelPriceLkrPerLitre, "fuelPriceLkrPerLitre");
        requireNonNegative(handlingFeePerKgLkr, "handlingFeePerKgLkr");
        requireNonNegative(spoilageRatePer100KmPct, "spoilageRatePer100KmPct");

        BigDecimal spoilageFraction = distanceKm
                .divide(ONE_HUNDRED, MathContext.DECIMAL128)
                .multiply(spoilageRatePer100KmPct)
                .divide(ONE_HUNDRED, MathContext.DECIMAL128)
                .min(BigDecimal.ONE);
        BigDecimal effectiveVolumeKg = quantityKg.multiply(
                BigDecimal.ONE.subtract(spoilageFraction),
                MathContext.DECIMAL128
        );
        BigDecimal spoilageLossKg = quantityKg.subtract(effectiveVolumeKg);
        BigDecimal grossRevenue = effectiveVolumeKg.multiply(
                predictedPriceLkrPerKg,
                MathContext.DECIMAL128
        );
        BigDecimal trips = quantityKg.divide(
                vehicleType.getCapacityKg(),
                0,
                RoundingMode.CEILING
        ).max(BigDecimal.ONE);
        BigDecimal transportCost = TWO
                .multiply(distanceKm)
                .multiply(terrainFactor)
                .multiply(vehicleType.getLitresPerKm())
                .multiply(fuelPriceLkrPerLitre)
                .multiply(trips);
        BigDecimal fuelLitres = TWO
                .multiply(distanceKm)
                .multiply(terrainFactor)
                .multiply(vehicleType.getLitresPerKm())
                .multiply(trips);
        BigDecimal handlingCost = quantityKg.multiply(handlingFeePerKgLkr);
        BigDecimal netProfit = grossRevenue
                .subtract(transportCost)
                .subtract(handlingCost);

        return new ProfitBreakdown(
                effectiveVolumeKg,
                spoilageLossKg.multiply(
                        predictedPriceLkrPerKg,
                        MathContext.DECIMAL128
                ),
                grossRevenue,
                transportCost,
                handlingCost,
                netProfit,
                fuelLitres,
                trips
        );
    }

    public BigDecimal relativeUpliftPct(
            BigDecimal alternativeNetProfit,
            BigDecimal defaultNetProfit
    ) {
        if (defaultNetProfit.signum() <= 0) {
            return null;
        }
        return alternativeNetProfit
                .subtract(defaultNetProfit)
                .divide(defaultNetProfit, MathContext.DECIMAL128)
                .multiply(ONE_HUNDRED);
    }

    public BigDecimal displayMoney(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal displayPercentage(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private void requirePositive(BigDecimal value, String name) {
        if (value == null || value.signum() <= 0) {
            throw new IllegalArgumentException(name + " must be positive");
        }
    }

    private void requireNonNegative(BigDecimal value, String name) {
        if (value == null || value.signum() < 0) {
            throw new IllegalArgumentException(name + " must be non-negative");
        }
    }
}

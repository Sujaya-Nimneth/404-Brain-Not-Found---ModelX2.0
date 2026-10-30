package com.modelx.atie.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.dto.ProfitBreakdown;

class ProfitMarginCalculatorTest {
    private final ProfitMarginCalculator calculator = new ProfitMarginCalculator();

    @Test
    void canonicalDambullaCalculationMatchesContract() {
        ProfitBreakdown result = calculate("154", "70", "1.00");

        assertThat(calculator.displayMoney(result.effectiveVolumeKg()))
                .isEqualByComparingTo("989.50");
        assertThat(calculator.displayMoney(result.grossRevenueLkr()))
                .isEqualByComparingTo("152383.00");
        assertThat(calculator.displayMoney(result.transportCostLkr()))
                .isEqualByComparingTo("3169.60");
        assertThat(calculator.displayMoney(result.handlingCostLkr()))
                .isEqualByComparingTo("2500.00");
        assertThat(calculator.displayMoney(result.netProfitLkr()))
                .isEqualByComparingTo("146713.40");
        assertThat(calculator.displayMoney(result.spoilageLossLkr()))
                .isEqualByComparingTo("1617.00");
        assertThat(result.fuelLitres()).isEqualByComparingTo("11.20");
        assertThat(result.trips()).isEqualByComparingTo("1");
    }

    @Test
    void canonicalPettahCalculationMatchesContract() {
        ProfitBreakdown result = calculate("187.50", "205", "1.00");

        assertThat(calculator.displayMoney(result.effectiveVolumeKg()))
                .isEqualByComparingTo("969.25");
        assertThat(calculator.displayMoney(result.grossRevenueLkr()))
                .isEqualByComparingTo("181734.38");
        assertThat(calculator.displayMoney(result.transportCostLkr()))
                .isEqualByComparingTo("9282.40");
        assertThat(calculator.displayMoney(result.netProfitLkr()))
                .isEqualByComparingTo("169951.98");
    }

    @Test
    void relativeUpliftMatchesCanonicalContract() {
        BigDecimal uplift = calculator.relativeUpliftPct(
                new BigDecimal("169951.98"),
                new BigDecimal("146713.40")
        );

        assertThat(calculator.displayPercentage(uplift))
                .isEqualByComparingTo("15.84");
    }

    @Test
    void relativeUpliftIsNullForNonPositiveDefaultProfit() {
        assertThat(calculator.relativeUpliftPct(
                new BigDecimal("5000"),
                BigDecimal.ZERO
        )).isNull();
        assertThat(calculator.relativeUpliftPct(
                new BigDecimal("5000"),
                new BigDecimal("-100")
        )).isNull();
    }

    @Test
    void terrainRaisesFuelCostButNotSpoilage() {
        ProfitBreakdown flat = calculate("165", "175", "1.00");
        ProfitBreakdown hilly = calculate("165", "175", "1.25");

        assertThat(hilly.effectiveVolumeKg())
                .isEqualByComparingTo(flat.effectiveVolumeKg());
        assertThat(hilly.transportCostLkr()).isGreaterThan(flat.transportCostLkr());
    }

    @Test
    void multipleTripsAreChargedWhenVolumeExceedsCapacity() {
        ProfitBreakdown single = calculate("170", "70", "1.00", "1000");
        ProfitBreakdown doubleTrip = calculate("170", "70", "1.00", "1501");

        assertThat(doubleTrip.transportCostLkr())
                .isEqualByComparingTo(single.transportCostLkr().multiply(new BigDecimal("2")));
    }

    @Test
    void invalidInputsAreRejected() {
        assertThatThrownBy(() -> calculate("0", "70", "1.00"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("predictedPrice");
    }

    private ProfitBreakdown calculate(String price, String distance, String terrain) {
        return calculate(price, distance, terrain, "1000");
    }

    private ProfitBreakdown calculate(
            String price,
            String distance,
            String terrain,
            String quantity
    ) {
        return calculator.calculate(
                new BigDecimal(price),
                new BigDecimal(quantity),
                new BigDecimal(distance),
                new BigDecimal(terrain),
                new BigDecimal("283"),
                new BigDecimal("2.50"),
                new BigDecimal("1.50"),
                VehicleType.MINI_TRUCK_BATTA
        );
    }
}

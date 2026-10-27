package com.modelx.atie.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.dto.MarketComparison;

class RoutingDecisionServiceTest {
    private final RoutingDecisionService service = new RoutingDecisionService(
            new AtieProperties(
                    "http://localhost:8000",
                    new BigDecimal("5.0"),
                    new BigDecimal("1000.00"),
                    new BigDecimal("10.0"),
                    List.of("http://localhost:5173")
            )
    );

    @Test
    void canonicalPettahReroutePassesSafeMargin() {
        RoutingDecisionService.Decision result = service.decide(
                "DAMBULLA",
                List.of(
                        market("DAMBULLA", "146713.40", "0.00"),
                        market("PETTAH_COLOMBO", "169951.98", "15.84"),
                        market("MEEGODA", "155639.40", "6.08")
                )
        );

        assertThat(result.primaryDirective().severity()).isEqualTo("CRITICAL_REROUTE");
        assertThat(result.recommendedMarketCode()).isEqualTo("PETTAH_COLOMBO");
        assertThat(result.primaryDirective().profitDeltaLkr())
                .isEqualByComparingTo("23238.58");
        assertThat(result.primaryDirective().profitUpliftPct())
                .isEqualByComparingTo("15.84");
    }

    @Test
    void alternativeBelowFivePercentDoesNotReroute() {
        RoutingDecisionService.Decision result = service.decide(
                "DAMBULLA",
                List.of(
                        market("DAMBULLA", "100000", "0"),
                        market("PETTAH_COLOMBO", "104999", "4.999")
                )
        );

        assertThat(result.primaryDirective().severity()).isEqualTo("PROCEED_DEFAULT");
        assertThat(result.recommendedMarketCode()).isNull();
    }

    @Test
    void nonPositiveDefaultWithSafeAlternativeReroutesWithoutPercentage() {
        RoutingDecisionService.Decision result = service.decide(
                "DAMBULLA",
                List.of(
                        market("DAMBULLA", "-5000", null),
                        market("PETTAH_COLOMBO", "15000", null)
                )
        );

        assertThat(result.primaryDirective().severity()).isEqualTo("CRITICAL_REROUTE");
        assertThat(result.primaryDirective().profitUpliftPct()).isNull();
    }

    @Test
    void nonPositiveDefaultWithoutSafeAlternativeHoldsHarvest() {
        RoutingDecisionService.Decision result = service.decide(
                "DAMBULLA",
                List.of(
                        market("DAMBULLA", "-5000", null),
                        market("PETTAH_COLOMBO", "-1000", null)
                )
        );

        assertThat(result.primaryDirective().severity()).isEqualTo("HOLD_HARVEST");
    }

    @Test
    void absoluteFloorStillAppliesToPositiveProfit() {
        RoutingDecisionService.Decision result = service.decide(
                "DAMBULLA",
                List.of(
                        market("DAMBULLA", "100", "0"),
                        market("PETTAH_COLOMBO", "106", "6")
                )
        );

        assertThat(result.primaryDirective().severity()).isEqualTo("PROCEED_DEFAULT");
    }

    private MarketComparison market(
            String code,
            String netProfit,
            String uplift
    ) {
        return new MarketComparison(
                code,
                code,
                new BigDecimal("100"),
                new BigDecimal("100"),
                new BigDecimal("100000"),
                new BigDecimal("1000"),
                new BigDecimal("0"),
                new BigDecimal("0"),
                new BigDecimal(netProfit),
                new BigDecimal("100"),
                uplift == null ? null : new BigDecimal(uplift),
                false,
                "STABLE"
        );
    }
}

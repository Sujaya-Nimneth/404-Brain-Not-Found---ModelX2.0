package com.modelx.atie.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.dto.ProfitBreakdown;

class GoldenRoutingContractTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ProfitMarginCalculator calculator = new ProfitMarginCalculator();

    @Test
    void sharedGoldenFixturesMatchBackendProfitAndDecisionContract() throws IOException {
        JsonNode golden = objectMapper.readTree(Files.readString(resolveFixturePath()));
        BigDecimal diesel = new BigDecimal(golden.get("diesel_price_lkr").asText());
        BigDecimal petrol = new BigDecimal(golden.get("petrol_price_lkr").asText());
        RoutingDecisionService decisionService = new RoutingDecisionService(
                new AtieProperties(
                        "http://localhost:8000",
                        new BigDecimal(golden.get("safe_margin_pct").asText()),
                        new BigDecimal(golden.get("safe_absolute_floor_lkr").asText()),
                        new BigDecimal("10.0"),
                        List.of("http://localhost:5173"),
                        "",
                        3,
                        15
                )
        );

        for (JsonNode profitCase : golden.get("profit_cases")) {
            String name = profitCase.get("name").asText();
            VehicleType vehicle = VehicleType.valueOf(
                    profitCase.get("vehicle_type").asText()
            );
            BigDecimal fuelPrice = vehicle.getFuelType() == VehicleType.FuelType.DIESEL
                    ? diesel
                    : petrol;
            ProfitBreakdown breakdown = calculator.calculate(
                    new BigDecimal(profitCase.get("price_lkr_per_kg").asText()),
                    new BigDecimal(profitCase.get("quantity_kg").asText()),
                    new BigDecimal(profitCase.get("distance_km").asText()),
                    new BigDecimal(profitCase.get("terrain_factor").asText()),
                    fuelPrice,
                    new BigDecimal(profitCase.get("handling_fee_per_kg_lkr").asText()),
                    new BigDecimal(profitCase.get("spoilage_rate_per_100km_pct").asText()),
                    vehicle
            );
            JsonNode expected = profitCase.get("expected");
            assertThat(calculator.displayMoney(breakdown.effectiveVolumeKg()))
                    .as(name + " effective_volume_kg")
                    .isEqualByComparingTo(expected.get("effective_volume_kg").asText());
            assertThat(calculator.displayMoney(breakdown.grossRevenueLkr()))
                    .as(name + " gross_revenue_lkr")
                    .isEqualByComparingTo(expected.get("gross_revenue_lkr").asText());
            assertThat(calculator.displayMoney(breakdown.transportCostLkr()))
                    .as(name + " transport_cost_lkr")
                    .isEqualByComparingTo(expected.get("transport_cost_lkr").asText());
            assertThat(calculator.displayMoney(breakdown.handlingCostLkr()))
                    .as(name + " handling_cost_lkr")
                    .isEqualByComparingTo(expected.get("handling_cost_lkr").asText());
            assertThat(calculator.displayMoney(breakdown.spoilageLossLkr()))
                    .as(name + " spoilage_loss_lkr")
                    .isEqualByComparingTo(expected.get("spoilage_loss_lkr").asText());
            assertThat(calculator.displayMoney(breakdown.netProfitLkr()))
                    .as(name + " net_profit_lkr")
                    .isEqualByComparingTo(expected.get("net_profit_lkr").asText());
        }

        for (JsonNode decisionCase : golden.get("decision_cases")) {
            String name = decisionCase.get("name").asText();
            String defaultMarket = decisionCase.get("default_market_code").asText();
            JsonNode netProfitsNode = decisionCase.get("net_profits");
            BigDecimal defaultNet = new BigDecimal(
                    netProfitsNode.get(defaultMarket).asText()
            );
            List<MarketEvaluation> evaluations = new ArrayList<>();
            netProfitsNode.fields().forEachRemaining(entry -> {
                BigDecimal net = new BigDecimal(entry.getValue().asText());
                evaluations.add(new MarketEvaluation(
                        entry.getKey(),
                        entry.getKey(),
                        new BigDecimal("100"),
                        new BigDecimal("100"),
                        new ProfitBreakdown(
                                new BigDecimal("1000"),
                                BigDecimal.ZERO,
                                net.add(new BigDecimal("1000")),
                                new BigDecimal("1000"),
                                BigDecimal.ZERO,
                                net,
                                new BigDecimal("8"),
                                BigDecimal.ONE
                        ),
                        new BigDecimal("100"),
                        calculator.relativeUpliftPct(net, defaultNet),
                        "STABLE"
                ));
            });

            RoutingDecisionService.Decision decision = decisionService.decide(
                    defaultMarket,
                    evaluations
            );
            JsonNode expected = decisionCase.get("expected");
            assertThat(decision.primaryDirective().severity())
                    .as(name + " severity")
                    .isEqualTo(expected.get("severity").asText());
            JsonNode expectedRecommended = expected.get("recommended_market_code");
            if (expectedRecommended.isNull()) {
                assertThat(decision.recommendedMarketCode()).as(name).isNull();
            } else {
                assertThat(decision.recommendedMarketCode())
                        .as(name)
                        .isEqualTo(expectedRecommended.asText());
            }
            JsonNode expectedDelta = expected.get("profit_delta_lkr");
            if (expectedDelta.isNull()) {
                assertThat(decision.primaryDirective().profitDeltaLkr()).as(name).isNull();
            } else {
                assertThat(decision.primaryDirective().profitDeltaLkr())
                        .as(name)
                        .isEqualByComparingTo(expectedDelta.asText());
            }
            JsonNode expectedUplift = expected.get("profit_uplift_pct");
            if (expectedUplift.isNull()) {
                assertThat(decision.primaryDirective().profitUpliftPct()).as(name).isNull();
            } else {
                assertThat(decision.primaryDirective().profitUpliftPct())
                        .as(name)
                        .isEqualByComparingTo(expectedUplift.asText());
            }
        }
    }

    private static Path resolveFixturePath() {
        Path fromBackend = Path.of(
                "..",
                "ml-service",
                "tests",
                "fixtures",
                "routing_golden.json"
        );
        if (Files.exists(fromBackend)) {
            return fromBackend;
        }
        return Path.of("ml-service", "tests", "fixtures", "routing_golden.json");
    }
}

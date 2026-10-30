package com.modelx.atie.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.domain.DirectiveSeverity;
import com.modelx.atie.dto.PrimaryDirective;

@Service
public class RoutingDecisionService {
    private final AtieProperties properties;

    public RoutingDecisionService(AtieProperties properties) {
        this.properties = properties;
    }

    public Decision decide(
            String defaultMarketCode,
            List<MarketEvaluation> comparisons
    ) {
        MarketEvaluation defaultMarket = comparisons.stream()
                .filter(market -> market.marketCode().equals(defaultMarketCode))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "default market is missing from comparisons"
                ));

        List<MarketEvaluation> alternatives = comparisons.stream()
                .filter(market -> !market.marketCode().equals(defaultMarketCode))
                .sorted(Comparator.comparing(
                        (MarketEvaluation market) -> market.profit().netProfitLkr()
                ).reversed())
                .toList();

        Optional<MarketEvaluation> selected = alternatives.stream()
                .filter(alternative -> passesSafeMargin(defaultMarket, alternative))
                .findFirst();

        if (selected.isPresent()) {
            MarketEvaluation winner = selected.get();
            BigDecimal delta = winner.profit().netProfitLkr()
                    .subtract(defaultMarket.profit().netProfitLkr());
            BigDecimal uplift = winner.profitUpliftPct();
            String explanation = "Net profit at %s is LKR %s higher than %s after transport, spoilage, and handling costs."
                    .formatted(
                            winner.marketName(),
                            delta.setScale(2, java.math.RoundingMode.HALF_UP)
                                    .toPlainString(),
                            defaultMarket.marketName()
                    );
            return new Decision(
                    new PrimaryDirective(
                            DirectiveSeverity.CRITICAL_REROUTE.name(),
                            "Reroute to " + winner.marketName(),
                            explanation,
                            defaultMarketCode,
                            winner.marketCode(),
                            delta.setScale(2, RoundingMode.HALF_UP),
                            uplift == null
                                    ? null
                                    : uplift.setScale(2, RoundingMode.HALF_UP)
                    ),
                    winner.marketCode()
            );
        }

        if (defaultMarket.profit().netProfitLkr().signum() <= 0) {
            return new Decision(
                    new PrimaryDirective(
                            DirectiveSeverity.HOLD_HARVEST.name(),
                            "Hold the harvest",
                            "No candidate market clears the safe-profit floor. Avoid dispatching this consignment.",
                            defaultMarketCode,
                            null,
                            null,
                            null
                    ),
                    null
            );
        }

        return new Decision(
                new PrimaryDirective(
                        DirectiveSeverity.PROCEED_DEFAULT.name(),
                        "Proceed to " + defaultMarket.marketName(),
                        "No alternative beats the default market by the required safe margin.",
                        defaultMarketCode,
                        defaultMarketCode,
                        BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                        BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                ),
                null
        );
    }

    private boolean passesSafeMargin(
            MarketEvaluation defaultMarket,
            MarketEvaluation alternative
    ) {
        BigDecimal delta = alternative.profit().netProfitLkr()
                .subtract(defaultMarket.profit().netProfitLkr());
        if (delta.compareTo(properties.safeAbsoluteFloorLkr()) < 0) {
            return false;
        }
        if (defaultMarket.profit().netProfitLkr().signum() <= 0) {
            return alternative.profit().netProfitLkr().signum() > 0;
        }
        BigDecimal uplift = alternative.profitUpliftPct();
        return uplift != null
                && uplift.compareTo(properties.safeMarginPct()) >= 0;
    }

    public record Decision(
            PrimaryDirective primaryDirective,
            String recommendedMarketCode
    ) {
    }
}

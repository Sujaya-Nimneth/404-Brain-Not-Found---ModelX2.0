package com.modelx.atie.service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.domain.DirectiveSeverity;
import com.modelx.atie.dto.MarketComparison;
import com.modelx.atie.dto.PrimaryDirective;

@Service
public class RoutingDecisionService {
    private final AtieProperties properties;

    public RoutingDecisionService(AtieProperties properties) {
        this.properties = properties;
    }

    public Decision decide(
            String defaultMarketCode,
            List<MarketComparison> comparisons
    ) {
        MarketComparison defaultMarket = comparisons.stream()
                .filter(market -> market.marketCode().equals(defaultMarketCode))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "default market is missing from comparisons"
                ));

        List<MarketComparison> alternatives = comparisons.stream()
                .filter(market -> !market.marketCode().equals(defaultMarketCode))
                .sorted(Comparator.comparing(MarketComparison::netProfitLkr).reversed())
                .toList();

        Optional<MarketComparison> selected = alternatives.stream()
                .filter(alternative -> passesSafeMargin(defaultMarket, alternative))
                .findFirst();

        if (selected.isPresent()) {
            MarketComparison winner = selected.get();
            BigDecimal delta = winner.netProfitLkr()
                    .subtract(defaultMarket.netProfitLkr());
            BigDecimal uplift = winner.profitUpliftPct();
            String explanation = "Net profit at %s is LKR %s higher than %s after transport, spoilage, and handling costs."
                    .formatted(
                            winner.marketName(),
                            delta.toPlainString(),
                            defaultMarket.marketName()
                    );
            return new Decision(
                    new PrimaryDirective(
                            DirectiveSeverity.CRITICAL_REROUTE.name(),
                            "Reroute to " + winner.marketName(),
                            explanation,
                            defaultMarketCode,
                            winner.marketCode(),
                            delta.setScale(2),
                            uplift
                    ),
                    winner.marketCode()
            );
        }

        if (defaultMarket.netProfitLkr().signum() <= 0) {
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
                        BigDecimal.ZERO.setScale(2),
                        BigDecimal.ZERO.setScale(2)
                ),
                null
        );
    }

    private boolean passesSafeMargin(
            MarketComparison defaultMarket,
            MarketComparison alternative
    ) {
        BigDecimal delta = alternative.netProfitLkr()
                .subtract(defaultMarket.netProfitLkr());
        if (delta.compareTo(properties.safeAbsoluteFloorLkr()) < 0) {
            return false;
        }
        if (defaultMarket.netProfitLkr().signum() <= 0) {
            return alternative.netProfitLkr().signum() > 0;
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

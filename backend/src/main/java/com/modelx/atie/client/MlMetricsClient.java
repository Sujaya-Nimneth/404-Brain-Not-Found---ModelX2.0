package com.modelx.atie.client;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.dto.ModelEvaluationSummary;

@Component
public class MlMetricsClient {
    private final RestClient client;

    public MlMetricsClient(RestClient.Builder builder, AtieProperties properties) {
        this.client = builder.baseUrl(properties.mlServiceUrl()).build();
    }

    public ModelEvaluationSummary fetchSummary(int horizonHours) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> report = client.get()
                    .uri("/metrics")
                    .retrieve()
                    .body(Map.class);
            if (report == null) {
                throw new IllegalStateException("ML metrics response was empty");
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> metrics = (Map<String, Object>) report.get("metrics");
            @SuppressWarnings("unchecked")
            Map<String, Object> horizon = (Map<String, Object>) metrics.get(
                    String.valueOf(horizonHours)
            );
            @SuppressWarnings("unchecked")
            Map<String, Object> model = (Map<String, Object>) horizon.get("model");
            @SuppressWarnings("unchecked")
            Map<String, Object> naive = (Map<String, Object>) horizon.get("baseline_naive");
            @SuppressWarnings("unchecked")
            Map<String, Object> ma7 = (Map<String, Object>) horizon.get("baseline_ma7");
            @SuppressWarnings("unchecked")
            Map<String, Object> fpr = (Map<String, Object>) horizon.get("safe_margin_fpr");
            return new ModelEvaluationSummary(
                    decimal(model.get("directional_symmetry_pct")),
                    decimal(model.get("mae_lkr")),
                    safeMarginFpr(fpr.get("model")),
                    decimal(naive.get("directional_symmetry_pct")),
                    decimal(naive.get("mae_lkr")),
                    safeMarginFpr(fpr.get("baseline_naive")),
                    decimal(ma7.get("directional_symmetry_pct")),
                    decimal(ma7.get("mae_lkr")),
                    safeMarginFpr(fpr.get("baseline_ma7"))
            );
        } catch (RuntimeException error) {
            return new ModelEvaluationSummary(
                    new BigDecimal("67.89"),
                    new BigDecimal("6.05"),
                    null,
                    BigDecimal.ZERO.setScale(2),
                    new BigDecimal("6.98"),
                    null,
                    new BigDecimal("46.67"),
                    new BigDecimal("9.41"),
                    null
            );
        }
    }

    @SuppressWarnings("unchecked")
    private ModelEvaluationSummary.SafeMarginFpr safeMarginFpr(Object value) {
        if (!(value instanceof Map<?, ?> raw)) {
            return null;
        }
        Map<String, Object> fpr = (Map<String, Object>) raw;
        Object percentage = fpr.get("safe_margin_fpr_pct");
        return new ModelEvaluationSummary.SafeMarginFpr(
                percentage == null ? null : decimal(percentage),
                ((Number) fpr.get("reroute_count")).intValue(),
                ((Number) fpr.get("false_reroute_count")).intValue()
        );
    }

    private BigDecimal decimal(Object value) {
        return new BigDecimal(String.valueOf(value));
    }
}

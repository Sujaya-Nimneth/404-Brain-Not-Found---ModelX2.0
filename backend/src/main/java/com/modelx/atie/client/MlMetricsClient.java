package com.modelx.atie.client;

import java.io.IOException;
import java.math.BigDecimal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.dto.ModelEvaluationSummary;

@Component
public class MlMetricsClient {
    private static final Logger log = LoggerFactory.getLogger(MlMetricsClient.class);

    private final RestClient client;
    private final ObjectMapper objectMapper;

    public MlMetricsClient(
            RestClient.Builder builder,
            AtieProperties properties,
            ObjectMapper objectMapper
    ) {
        this.client = builder.baseUrl(properties.mlServiceUrl()).build();
        this.objectMapper = objectMapper;
    }

    public ModelEvaluationSummary fetchSummary(int horizonHours) {
        try {
            String body = client.get()
                    .uri("/metrics")
                    .retrieve()
                    .body(String.class);
            if (body == null) {
                throw new IllegalStateException("ML metrics response was empty");
            }
            JsonNode horizon = objectMapper.readTree(body)
                    .path("metrics")
                    .path(String.valueOf(horizonHours));
            if (!horizon.isObject()) {
                throw new IllegalStateException(
                        "ML metrics are unavailable for horizon " + horizonHours
                );
            }
            JsonNode model = requiredObject(horizon, "model");
            JsonNode naive = requiredObject(horizon, "baseline_naive");
            JsonNode ma7 = requiredObject(horizon, "baseline_ma7");
            JsonNode fpr = requiredObject(horizon, "safe_margin_fpr");
            return new ModelEvaluationSummary(
                    true,
                    "Evaluation report loaded from the ML service.",
                    decimal(model, "directional_symmetry_pct"),
                    decimal(model, "mae_lkr"),
                    safeMarginFpr(fpr.get("model")),
                    decimal(naive, "directional_symmetry_pct"),
                    decimal(naive, "mae_lkr"),
                    safeMarginFpr(fpr.get("baseline_naive")),
                    decimal(ma7, "directional_symmetry_pct"),
                    decimal(ma7, "mae_lkr"),
                    safeMarginFpr(fpr.get("baseline_ma7"))
            );
        } catch (RuntimeException | IOException error) {
            log.warn("ML evaluation metrics unavailable: {}", error.getMessage());
            return ModelEvaluationSummary.unavailable(
                    "Evaluation metrics are temporarily unavailable."
            );
        }
    }

    private JsonNode requiredObject(JsonNode parent, String field) {
        JsonNode value = parent.get(field);
        if (value == null || !value.isObject()) {
            throw new IllegalStateException("ML metrics field is missing: " + field);
        }
        return value;
    }

    private ModelEvaluationSummary.SafeMarginFpr safeMarginFpr(JsonNode node) {
        if (node == null || !node.isObject()) {
            return null;
        }
        JsonNode percentage = node.get("safe_margin_fpr_pct");
        JsonNode rerouteCount = node.get("reroute_count");
        JsonNode falseRerouteCount = node.get("false_reroute_count");
        if (rerouteCount == null || falseRerouteCount == null) {
            return null;
        }
        return new ModelEvaluationSummary.SafeMarginFpr(
                percentage == null || percentage.isNull()
                        ? null
                        : percentage.decimalValue(),
                rerouteCount.intValue(),
                falseRerouteCount.intValue()
        );
    }

    private BigDecimal decimal(JsonNode parent, String field) {
        JsonNode value = parent.get(field);
        if (value == null || !value.isNumber()) {
            throw new IllegalStateException("ML metric is missing: " + field);
        }
        return value.decimalValue();
    }
}

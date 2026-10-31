package com.modelx.atie.client;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.dto.ModelEvaluationSummary;

@Component
public class MlMetricsClient {
    private static final Logger log = LoggerFactory.getLogger(MlMetricsClient.class);
    private static final Duration DEFAULT_CACHE_TTL = Duration.ofMinutes(5);

    private final RestClient client;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final Duration cacheTtl;
    private volatile CachedMetrics cachedMetrics;

    @Autowired
    public MlMetricsClient(
            RestClient.Builder builder,
            AtieProperties properties,
            ObjectMapper objectMapper
    ) {
        this(builder, properties, objectMapper, Clock.systemUTC(), DEFAULT_CACHE_TTL);
    }

    MlMetricsClient(
            RestClient.Builder builder,
            AtieProperties properties,
            ObjectMapper objectMapper,
            Clock clock,
            Duration cacheTtl
    ) {
        this.client = builder.baseUrl(properties.mlServiceUrl()).build();
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.cacheTtl = cacheTtl;
    }

    public ModelEvaluationSummary fetchSummary(int horizonHours) {
        CachedMetrics snapshot = cachedMetrics;
        Instant now = clock.instant();
        if (snapshot != null && now.isBefore(snapshot.expiresAt())) {
            return parseHorizonSummary(
                    snapshot.root(),
                    horizonHours,
                    "Evaluation report loaded from the ML service."
            );
        }

        try {
            JsonNode root = fetchMetricsRoot();
            cachedMetrics = new CachedMetrics(root, now.plus(cacheTtl));
            return parseHorizonSummary(
                    root,
                    horizonHours,
                    "Evaluation report loaded from the ML service."
            );
        } catch (RuntimeException | IOException error) {
            log.warn("ML evaluation metrics unavailable: {}", error.getMessage());
            if (snapshot != null) {
                try {
                    return parseHorizonSummary(
                            snapshot.root(),
                            horizonHours,
                            "Evaluation report served from cached ML service snapshot."
                    );
                } catch (RuntimeException ignored) {
                    // Fall through to unavailable summary if horizon is absent.
                }
            }
            return ModelEvaluationSummary.unavailable(
                    "Evaluation metrics are temporarily unavailable."
            );
        }
    }

    private JsonNode fetchMetricsRoot() throws IOException {
        String body = client.get()
                .uri("/metrics")
                .retrieve()
                .body(String.class);
        if (body == null) {
            throw new IllegalStateException("ML metrics response was empty");
        }
        return objectMapper.readTree(body);
    }

    private ModelEvaluationSummary parseHorizonSummary(
            JsonNode root,
            int horizonHours,
            String statusMessage
    ) {
        JsonNode horizon = root
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
                statusMessage,
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
    }

    private record CachedMetrics(JsonNode root, Instant expiresAt) {
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

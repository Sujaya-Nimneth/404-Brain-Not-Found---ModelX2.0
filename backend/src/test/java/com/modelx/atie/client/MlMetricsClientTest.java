package com.modelx.atie.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.modelx.atie.config.AtieProperties;
import com.modelx.atie.config.RequestIdFilter;
import com.modelx.atie.config.RestClientConfig;
import com.modelx.atie.dto.ModelEvaluationSummary;

class MlMetricsClientTest {
    @Test
    void loadsModelAndBothMandatoryBaselines() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/metrics"))
                .andRespond(withSuccess(metricsJson(), MediaType.APPLICATION_JSON));

        ModelEvaluationSummary summary = client(builder).fetchSummary(48);

        assertThat(summary.available()).isTrue();
        assertThat(summary.modelDirectionalSymmetryPct())
                .isEqualByComparingTo("67.89");
        assertThat(summary.naiveMaeLkr()).isEqualByComparingTo("6.98");
        assertThat(summary.ma7DirectionalSymmetryPct())
                .isEqualByComparingTo("46.67");
        assertThat(summary.modelSafeMarginFpr().safeMarginFprPct())
                .isEqualByComparingTo("3.00");
        server.verify();
    }

    @Test
    void unavailableMetricsAreNotReplacedWithHardcodedValues() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/metrics"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        ModelEvaluationSummary summary = client(builder).fetchSummary(48);

        assertThat(summary.available()).isFalse();
        assertThat(summary.message()).contains("temporarily unavailable");
        assertThat(summary.modelDirectionalSymmetryPct()).isNull();
        assertThat(summary.modelMaeLkr()).isNull();
        server.verify();
    }

    @Test
    void cachesMetricsWithinTtlAndRetainsLastKnownGoodOnTransientOutage() {
        AtomicReference<Instant> now = new AtomicReference<>(
                Instant.parse("2026-10-27T10:00:00Z")
        );
        Clock mutableClock = new Clock() {
            @Override
            public ZoneOffset getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(java.time.ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                return now.get();
            }
        };

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/metrics"))
                .andRespond(withSuccess(metricsJson(), MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://localhost:8000/metrics"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        MlMetricsClient metricsClient = new MlMetricsClient(
                builder,
                properties(),
                new ObjectMapper(),
                mutableClock,
                Duration.ofMinutes(5)
        );

        ModelEvaluationSummary first = metricsClient.fetchSummary(48);
        now.set(Instant.parse("2026-10-27T10:02:00Z"));
        ModelEvaluationSummary cached = metricsClient.fetchSummary(48);
        now.set(Instant.parse("2026-10-27T10:06:00Z"));
        ModelEvaluationSummary staleFallback = metricsClient.fetchSummary(48);

        assertThat(first.available()).isTrue();
        assertThat(cached.available()).isTrue();
        assertThat(staleFallback.available()).isTrue();
        assertThat(staleFallback.message()).contains("cached ML service snapshot");
        assertThat(staleFallback.modelDirectionalSymmetryPct())
                .isEqualByComparingTo("67.89");
        server.verify();
    }

    @Test
    void restClientCustomizerPropagatesMdcRequestIdHeader() {
        RestClient.Builder builder = RestClient.builder();
        new RestClientConfig().mlServiceTimeouts(properties()).customize(builder);
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/metrics"))
                .andExpect(header(RequestIdFilter.HEADER, "trace-e2e-99"))
                .andRespond(withSuccess(metricsJson(), MediaType.APPLICATION_JSON));

        MDC.put(RequestIdFilter.MDC_KEY, "trace-e2e-99");
        try {
            ModelEvaluationSummary summary = client(builder).fetchSummary(48);
            assertThat(summary.available()).isTrue();
        } finally {
            MDC.remove(RequestIdFilter.MDC_KEY);
        }
        server.verify();
    }

    private MlMetricsClient client(RestClient.Builder builder) {
        return new MlMetricsClient(builder, properties(), new ObjectMapper());
    }

    private AtieProperties properties() {
        return new AtieProperties(
                "http://localhost:8000",
                new BigDecimal("5.0"),
                new BigDecimal("1000.00"),
                new BigDecimal("10.0"),
                List.of("http://localhost:5173"),
                "",
                3,
                15
        );
    }

    private String metricsJson() {
        return """
                {
                  "metrics": {
                    "48": {
                      "model": {
                        "directional_symmetry_pct": 67.89,
                        "mae_lkr": 6.05
                      },
                      "baseline_naive": {
                        "directional_symmetry_pct": 0.00,
                        "mae_lkr": 6.98
                      },
                      "baseline_ma7": {
                        "directional_symmetry_pct": 46.67,
                        "mae_lkr": 9.41
                      },
                      "safe_margin_fpr": {
                        "model": {
                          "safe_margin_fpr_pct": 3.00,
                          "reroute_count": 6502,
                          "false_reroute_count": 195
                        },
                        "baseline_naive": {
                          "safe_margin_fpr_pct": 4.43,
                          "reroute_count": 6406,
                          "false_reroute_count": 284
                        },
                        "baseline_ma7": {
                          "safe_margin_fpr_pct": 7.25,
                          "reroute_count": 5531,
                          "false_reroute_count": 401
                        }
                      }
                    }
                  }
                }
                """;
    }
}

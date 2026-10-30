package com.modelx.atie.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.modelx.atie.config.AtieProperties;
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

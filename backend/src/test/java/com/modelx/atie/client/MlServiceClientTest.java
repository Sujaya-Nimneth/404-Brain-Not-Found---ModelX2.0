package com.modelx.atie.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.modelx.atie.config.AtieProperties;

class MlServiceClientTest {
    @Test
    void unavailableServiceUsesLabeledFallback() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=false"))
                .andRespond(withServerError().contentType(MediaType.APPLICATION_JSON));

        MlServiceClient client = new MlServiceClient(
                builder,
                properties()
        );
        MlServiceClient.MlForecastResponse response = client.predictBatch(
                "TOMATO",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA", "PETTAH_COLOMBO"),
                false
        );

        assertThat(response.forecastSource()).isEqualTo("FALLBACK");
        assertThat(response.predictions()).hasSize(2);
        assertThat(response.predictions().get(0).predictedPriceLkr())
                .isEqualByComparingTo("154.00");
        server.verify();
    }

    @Test
    void demoRequestIsForwardedToMlService() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=true"))
                .andRespond(withServerError().contentType(MediaType.APPLICATION_JSON));

        MlServiceClient client = new MlServiceClient(builder, properties());
        MlServiceClient.MlForecastResponse response = client.predictBatch(
                "TOMATO",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA", "PETTAH_COLOMBO"),
                true
        );

        assertThat(response.forecastSource()).isEqualTo("DEMO_FIXTURE");
        server.verify();
    }

    private AtieProperties properties() {
        return new AtieProperties(
                "http://localhost:8000",
                new java.math.BigDecimal("5.0"),
                new java.math.BigDecimal("1000.00"),
                new java.math.BigDecimal("10.0"),
                List.of("http://localhost:5173")
        );
    }
}

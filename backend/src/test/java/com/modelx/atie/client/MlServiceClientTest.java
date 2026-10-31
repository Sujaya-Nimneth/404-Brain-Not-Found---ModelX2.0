package com.modelx.atie.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.modelx.atie.config.AtieProperties;

class MlServiceClientTest {
    @Test
    void unavailableServiceUsesCropCorrectLabeledFallback() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=false"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        MlServiceClient client = client(builder);
        MlServiceClient.MlForecastResponse response = client.predictBatch(
                "CARROT",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA", "PETTAH_COLOMBO"),
                false
        );

        assertThat(response.forecastSource()).isEqualTo("FALLBACK");
        assertThat(response.inputDataState()).isEqualTo("SEED");
        assertThat(response.referenceDate()).isEqualTo(LocalDate.of(2026, 10, 27));
        assertThat(response.predictions()).hasSize(2);
        assertThat(response.predictions())
                .allSatisfy(forecast -> assertThat(forecast.currentPriceLkr())
                        .isNotEqualByComparingTo("220.00"));
        server.verify();
    }

    @Test
    void demoRequestFallsBackToTheExplicitFixture() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=true"))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        MlServiceClient.MlForecastResponse response = client(builder).predictBatch(
                "TOMATO",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA", "PETTAH_COLOMBO"),
                true
        );

        assertThat(response.forecastSource()).isEqualTo("DEMO_FIXTURE");
        assertThat(response.predictions().get(0).predictedPriceLkr())
                .isEqualByComparingTo("154.00");
        server.verify();
    }

    @Test
    void nonDemoTomatoFallbackDiffersFromDemoFixture() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=false"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        MlServiceClient.MlForecastResponse response = client(builder).predictBatch(
                "TOMATO",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA", "PETTAH_COLOMBO"),
                false
        );

        assertThat(response.forecastSource()).isEqualTo("FALLBACK");
        assertThat(response.predictions().get(0).predictedPriceLkr())
                .isNotEqualByComparingTo("154.00");
        assertThat(response.predictions().get(0).currentPriceLkr())
                .isNotEqualByComparingTo("220.00");
        server.verify();
    }

    @Test
    void demoRequestForUnsupportedCropFailsWithoutMislabelingFallback() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=true"))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        assertThatThrownBy(() -> client(builder).predictBatch(
                "CARROT",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA"),
                true
        ))
                .isInstanceOfSatisfying(MlServiceException.class, error -> {
                    assertThat(error.status()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(error.code()).isEqualTo("ML_REJECTED_REQUEST");
                });
        server.verify();
    }

    @Test
    void fourHundredResponsesArePropagatedWithoutFallback() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=false"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"detail\":\"unsupported crop\"}"));

        MlServiceClient client = client(builder);

        assertThatThrownBy(() -> client.predictBatch(
                "TOMATO",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA"),
                false
        ))
                .isInstanceOfSatisfying(MlServiceException.class, error -> {
                    assertThat(error.status()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(error.code()).isEqualTo("ML_REJECTED_REQUEST");
                });
        server.verify();
    }

    @Test
    void snakeCaseMlResponseBindsIntoMarketForecasts() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=true"))
                .andRespond(withSuccess("""
                        {
                          "crop_code": "TOMATO",
                          "horizon_hours": 48,
                          "reference_date": "2026-10-27",
                          "forecast_source": "DEMO_FIXTURE",
                          "model_version": "demo-fixture-v1.0",
                          "input_data_state": "SEED",
                          "predictions": [
                            {
                              "market_code": "DAMBULLA",
                              "current_price_lkr": 220.00,
                              "predicted_price_lkr": 154.00,
                              "baseline_naive_lkr": 220.00,
                              "baseline_ma7_lkr": 237.76,
                              "pct_change": -30.00,
                              "direction": "CRASH",
                              "glut_risk_level": "HIGH",
                              "confidence_score": 0.89,
                              "primary_driver": "Northern harvest arrivals"
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        MlServiceClient.MlForecastResponse response = client(builder).predictBatch(
                "TOMATO",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA"),
                true
        );

        assertThat(response.inputDataState()).isEqualTo("SEED");
        assertThat(response.predictions()).hasSize(1);
        assertThat(response.predictions().get(0).marketCode()).isEqualTo("DAMBULLA");
        assertThat(response.predictions().get(0).predictedPriceLkr())
                .isEqualByComparingTo("154.00");
        server.verify();
    }

    @Test
    void malformedMlResponsesBecomeContractErrors() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:8000/predict-batch?demo_mode=false"))
                .andRespond(withSuccess("""
                        {
                          "crop_code": "TOMATO",
                          "horizon_hours": 48,
                          "reference_date": "2026-10-27",
                          "forecast_source": "MODEL",
                          "model_version": "rf-v1.0",
                          "input_data_state": "CACHED",
                          "predictions": []
                        }
                        """, MediaType.APPLICATION_JSON));

        MlServiceClient client = client(builder);

        assertThatThrownBy(() -> client.predictBatch(
                "TOMATO",
                48,
                LocalDate.of(2026, 10, 27),
                List.of("DAMBULLA"),
                false
        ))
                .isInstanceOfSatisfying(MlServiceException.class, error -> {
                    assertThat(error.status()).isEqualTo(HttpStatus.BAD_GATEWAY);
                    assertThat(error.code()).isEqualTo("ML_CONTRACT_ERROR");
                });
    }

    private MlServiceClient client(RestClient.Builder builder) {
        return new MlServiceClient(builder, properties(), new ObjectMapper());
    }

    private AtieProperties properties() {
        return new AtieProperties(
                "http://localhost:8000",
                new java.math.BigDecimal("5.0"),
                new java.math.BigDecimal("1000.00"),
                new java.math.BigDecimal("10.0"),
                List.of("http://localhost:5173"),
                "",
                3,
                15
        );
    }
}

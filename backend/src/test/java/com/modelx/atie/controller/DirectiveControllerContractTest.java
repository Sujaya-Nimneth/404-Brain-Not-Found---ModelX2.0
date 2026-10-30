package com.modelx.atie.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.modelx.atie.config.JacksonConfig;
import com.modelx.atie.domain.VehicleType;
import com.modelx.atie.dto.AnalyzeRequest;
import com.modelx.atie.dto.AnalyzeResponse;
import com.modelx.atie.dto.MarketComparison;
import com.modelx.atie.dto.ModelEvaluationSummary;
import com.modelx.atie.dto.PrimaryDirective;
import com.modelx.atie.dto.WeatherAlert;
import com.modelx.atie.service.ArbitrageRoutingService;

class DirectiveControllerContractTest {
    private final ArbitrageRoutingService service = mock(
            ArbitrageRoutingService.class
    );
    private final ObjectMapper objectMapper = objectMapper();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new DirectiveController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .setMessageConverters(
                        new MappingJackson2HttpMessageConverter(objectMapper)
                )
                .build();
    }

    @Test
    void serializesEveryNestedResponseFieldAsSnakeCase() throws Exception {
        when(service.analyze(any())).thenReturn(response());

        mvc.perform(post("/api/v1/directives/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.forecast_source").value("DEMO_FIXTURE"))
                .andExpect(jsonPath("$.input_data_state").value("SEED"))
                .andExpect(jsonPath("$.primary_directive.default_market_code")
                        .value("DAMBULLA"))
                .andExpect(jsonPath("$.primary_directive.profit_delta_lkr")
                        .value(23238.58))
                .andExpect(jsonPath("$.market_comparisons[0].market_code")
                        .value("PETTAH_COLOMBO"))
                .andExpect(jsonPath("$.market_comparisons[0].is_recommended")
                        .value(true))
                .andExpect(jsonPath("$.market_comparisons[0].profit_uplift_pct")
                        .value(15.84))
                .andExpect(jsonPath("$.market_comparisons[0].fuel_litres")
                        .value(32.8))
                .andExpect(jsonPath("$.weather_alerts[0].extreme_weather")
                        .value(true))
                .andExpect(jsonPath(
                        "$.model_evaluation_summary.model_directional_symmetry_pct"
                ).value(67.89))
                .andExpect(jsonPath("$.primary_directive.defaultMarketCode")
                        .doesNotExist())
                .andExpect(jsonPath("$.market_comparisons[0].recommended")
                        .doesNotExist());
    }

    @Test
    void returnsMachineReadableValidationErrors() throws Exception {
        when(service.analyze(any())).thenThrow(
                new IllegalArgumentException("Default market is not reachable")
        );

        mvc.perform(post("/api/v1/directives/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message")
                        .value("Default market is not reachable"));
    }

    private AnalyzeRequest request() {
        return new AnalyzeRequest(
                "ANURADHAPURA",
                "DAMBULLA",
                "TOMATO",
                new BigDecimal("1000"),
                VehicleType.MINI_TRUCK_BATTA,
                48,
                true
        );
    }

    private AnalyzeResponse response() {
        return new AnalyzeResponse(
                "DEMO_FIXTURE",
                "SEED",
                "demo-fixture-v1.0",
                LocalDate.of(2026, 10, 27),
                new PrimaryDirective(
                        "CRITICAL_REROUTE",
                        "Reroute to Colombo Pettah",
                        "Pettah has the stronger net profit.",
                        "DAMBULLA",
                        "PETTAH_COLOMBO",
                        new BigDecimal("23238.58"),
                        new BigDecimal("15.84")
                ),
                List.of(new MarketComparison(
                        "PETTAH_COLOMBO",
                        "Colombo Pettah",
                        new BigDecimal("170.00"),
                        new BigDecimal("187.50"),
                        new BigDecimal("181734.38"),
                        new BigDecimal("9282.40"),
                        new BigDecimal("5765.63"),
                        new BigDecimal("2500.00"),
                        new BigDecimal("169951.98"),
                        new BigDecimal("205.00"),
                        new BigDecimal("23238.58"),
                        new BigDecimal("15.84"),
                        new BigDecimal("32.80"),
                        1,
                        new BigDecimal("1500.00"),
                        true,
                        "SURGE"
                )),
                List.of(new WeatherAlert(
                        "DAMBULLA",
                        "HIGH",
                        "Heavy rainfall",
                        new BigDecimal("18.20"),
                        true,
                        "DEMO_FIXTURE",
                        LocalDate.of(2026, 10, 27)
                )),
                new ModelEvaluationSummary(
                        true,
                        "Evaluation report loaded from the ML service.",
                        new BigDecimal("67.89"),
                        new BigDecimal("6.05"),
                        null,
                        new BigDecimal("0"),
                        new BigDecimal("6.98"),
                        null,
                        new BigDecimal("46.67"),
                        new BigDecimal("9.41"),
                        null
                )
        );
    }

    private ObjectMapper objectMapper() {
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();
        new JacksonConfig().snakeCaseJson().customize(builder);
        return builder.build();
    }
}

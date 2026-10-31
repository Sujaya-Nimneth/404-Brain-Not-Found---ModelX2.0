package com.modelx.atie.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.modelx.atie.dto.MarketHistoryResponse;
import com.modelx.atie.service.MarketHistoryService;

class MarketHistoryControllerTest {
    private final MarketHistoryService service = mock(MarketHistoryService.class);
    private final MarketHistoryController controller =
            new MarketHistoryController(service);

    @Test
    void returnsHistoryAndForecastTrajectory() {
        MarketHistoryResponse payload = new MarketHistoryResponse(
                "DAMBULLA",
                "Dambulla Dedicated Economic Centre",
                "TOMATO",
                14,
                LocalDate.of(2026, 10, 27),
                "MODEL",
                "rf-v1.0",
                List.of(new MarketHistoryResponse.HistoryPoint(
                        LocalDate.of(2026, 10, 27),
                        new BigDecimal("220.00"),
                        new BigDecimal("42.00")
                )),
                List.of(
                        new MarketHistoryResponse.ForecastPoint(
                                48,
                                new BigDecimal("154.00"),
                                new BigDecimal("220.00"),
                                new BigDecimal("237.76"),
                                "CRASH"
                        ),
                        new MarketHistoryResponse.ForecastPoint(
                                72,
                                new BigDecimal("155.00"),
                                new BigDecimal("220.00"),
                                new BigDecimal("237.76"),
                                "CRASH"
                        )
                )
        );
        when(service.history("DAMBULLA", "TOMATO", 14, false)).thenReturn(payload);

        ResponseEntity<MarketHistoryResponse> response =
                controller.history("DAMBULLA", "TOMATO", 14, false);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(payload);
        assertThat(response.getBody().forecastTrajectory())
                .extracting(MarketHistoryResponse.ForecastPoint::horizonHours)
                .containsExactly(48, 72);
    }

    @Test
    void nonNumericDaysQueryParameterReturns400InsteadOf500() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ApiExceptionHandler())
                .build();

        mvc.perform(get("/api/v1/markets/DAMBULLA/history").param("days", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }
}

package com.modelx.atie.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

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
        when(service.history("DAMBULLA", "TOMATO", 14)).thenReturn(payload);

        ResponseEntity<MarketHistoryResponse> response =
                controller.history("DAMBULLA", "TOMATO", 14);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(payload);
        assertThat(response.getBody().forecastTrajectory())
                .extracting(MarketHistoryResponse.ForecastPoint::horizonHours)
                .containsExactly(48, 72);
    }
}

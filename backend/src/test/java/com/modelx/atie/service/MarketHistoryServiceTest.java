package com.modelx.atie.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.modelx.atie.client.ForecastClient;
import com.modelx.atie.client.MlServiceClient;
import com.modelx.atie.dto.MarketForecast;
import com.modelx.atie.dto.MarketHistoryResponse;
import com.modelx.atie.entity.HistoricalPrice;
import com.modelx.atie.entity.Market;
import com.modelx.atie.repository.HistoricalPriceRepository;
import com.modelx.atie.repository.MarketRepository;

class MarketHistoryServiceTest {
    private final HistoricalPriceRepository prices = mock(HistoricalPriceRepository.class);
    private final MarketRepository markets = mock(MarketRepository.class);
    private final ForecastClient forecasts = mock(ForecastClient.class);
    private final MarketHistoryService service = new MarketHistoryService(
            prices,
            markets,
            forecasts
    );

    @Test
    void returnsChronologicalHistoryAndBothForecastHorizons() {
        Market market = entity(
                Market.class,
                "code", "DAMBULLA",
                "name", "Dambulla Dedicated Economic Centre"
        );
        when(markets.findByCode("DAMBULLA")).thenReturn(Optional.of(market));
        when(prices.findByMarketCodeAndCropCodeOrderByRecordedDateDesc(
                eq("DAMBULLA"),
                eq("TOMATO"),
                any()
        )).thenReturn(List.of(
                price("2026-10-27", "220.00"),
                price("2026-10-26", "218.00")
        ));
        when(forecasts.predictBatch(
                eq("TOMATO"),
                eq(48),
                eq(LocalDate.of(2026, 10, 27)),
                eq(List.of("DAMBULLA")),
                eq(false)
        )).thenReturn(forecast(48, "154.00", "CRASH"));
        when(forecasts.predictBatch(
                eq("TOMATO"),
                eq(72),
                eq(LocalDate.of(2026, 10, 27)),
                eq(List.of("DAMBULLA")),
                eq(false)
        )).thenReturn(forecast(72, "155.00", "CRASH"));

        MarketHistoryResponse response = service.history("dambulla", "tomato", 30);

        assertThat(response.marketCode()).isEqualTo("DAMBULLA");
        assertThat(response.history())
                .extracting(MarketHistoryResponse.HistoryPoint::date)
                .containsExactly(
                        LocalDate.of(2026, 10, 26),
                        LocalDate.of(2026, 10, 27)
                );
        assertThat(response.forecastTrajectory())
                .extracting(MarketHistoryResponse.ForecastPoint::horizonHours)
                .containsExactly(48, 72);
        assertThat(response.forecastSource()).isEqualTo("MODEL");
    }

    private HistoricalPrice price(String date, String value) {
        return entity(
                HistoricalPrice.class,
                "recordedDate", LocalDate.parse(date),
                "wholesalePriceLkrPerKg", new BigDecimal(value),
                "arrivalVolumeTonnes", new BigDecimal("42.00")
        );
    }

    private MlServiceClient.MlForecastResponse forecast(
            int horizon,
            String predicted,
            String direction
    ) {
        BigDecimal current = new BigDecimal("220.00");
        BigDecimal predictedValue = new BigDecimal(predicted);
        return new MlServiceClient.MlForecastResponse(
                "TOMATO",
                horizon,
                LocalDate.of(2026, 10, 27),
                "MODEL",
                "rf-v1.0",
                List.of(new MarketForecast(
                        "DAMBULLA",
                        current,
                        predictedValue,
                        current,
                        new BigDecimal("237.76"),
                        new BigDecimal("-30.00"),
                        direction,
                        "HIGH",
                        new BigDecimal("0.89"),
                        "Test forecast"
                ))
        );
    }

    private <T> T entity(Class<T> type, Object... values) {
        try {
            var constructor = type.getDeclaredConstructor();
            constructor.setAccessible(true);
            T entity = constructor.newInstance();
            for (int index = 0; index < values.length; index += 2) {
                ReflectionTestUtils.setField(
                        entity,
                        (String) values[index],
                        values[index + 1]
                );
            }
            return entity;
        } catch (ReflectiveOperationException error) {
            throw new IllegalStateException(error);
        }
    }
}

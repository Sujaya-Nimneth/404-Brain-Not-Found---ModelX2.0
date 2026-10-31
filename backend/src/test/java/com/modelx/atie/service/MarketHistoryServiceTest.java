package com.modelx.atie.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
import com.modelx.atie.entity.Crop;
import com.modelx.atie.entity.HistoricalPrice;
import com.modelx.atie.entity.Market;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.HistoricalPriceRepository;
import com.modelx.atie.repository.MarketRepository;

class MarketHistoryServiceTest {
    private final HistoricalPriceRepository prices = mock(HistoricalPriceRepository.class);
    private final MarketRepository markets = mock(MarketRepository.class);
    private final CropRepository crops = mock(CropRepository.class);
    private final ForecastClient forecasts = mock(ForecastClient.class);
    private final MarketHistoryService service = new MarketHistoryService(
            prices,
            markets,
            crops,
            forecasts
    );

    @Test
    void returnsChronologicalHistoryAndBothForecastHorizons() {
        Market market = entity(
                Market.class,
                "code", "DAMBULLA",
                "name", "Dambulla Dedicated Economic Centre"
        );
        when(crops.findByCode("TOMATO")).thenReturn(
                Optional.of(entity(Crop.class, "code", "TOMATO"))
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

    @Test
    void rejectsUnknownCropWithBadRequestInsteadOf404NoHistory() {
        when(crops.findByCode("DRAGONFRUIT")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.history("DAMBULLA", "dragonfruit", 30))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown crop: DRAGONFRUIT");
    }

    @Test
    void convergesToConsistentSourceWhenMlDegradesMidTrajectory() {
        Market market = entity(
                Market.class,
                "code", "DAMBULLA",
                "name", "Dambulla Dedicated Economic Centre"
        );
        when(crops.findByCode("TOMATO")).thenReturn(
                Optional.of(entity(Crop.class, "code", "TOMATO"))
        );
        when(markets.findByCode("DAMBULLA")).thenReturn(Optional.of(market));
        when(prices.findByMarketCodeAndCropCodeOrderByRecordedDateDesc(
                eq("DAMBULLA"),
                eq("TOMATO"),
                any()
        )).thenReturn(List.of(price("2026-10-27", "203.05")));

        when(forecasts.predictBatch(
                eq("TOMATO"),
                eq(48),
                eq(LocalDate.of(2026, 10, 27)),
                eq(List.of("DAMBULLA")),
                eq(false)
        )).thenReturn(
                forecast(48, "210.00", "STABLE", "MODEL"),
                forecast(48, "211.81", "STABLE", "FALLBACK")
        );
        when(forecasts.predictBatch(
                eq("TOMATO"),
                eq(72),
                eq(LocalDate.of(2026, 10, 27)),
                eq(List.of("DAMBULLA")),
                eq(false)
        )).thenReturn(forecast(72, "215.56", "STABLE", "FALLBACK"));

        MarketHistoryResponse response = service.history("DAMBULLA", "TOMATO", 14, false);

        assertThat(response.forecastSource()).isEqualTo("FALLBACK");
        assertThat(response.forecastTrajectory()).hasSize(2);
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
        return forecast(horizon, predicted, direction, "MODEL");
    }

    private MlServiceClient.MlForecastResponse forecast(
            int horizon,
            String predicted,
            String direction,
            String source
    ) {
        BigDecimal current = new BigDecimal("220.00");
        BigDecimal predictedValue = new BigDecimal(predicted);
        return new MlServiceClient.MlForecastResponse(
                "TOMATO",
                horizon,
                LocalDate.of(2026, 10, 27),
                source,
                "rf-v1.0",
                "CACHED",
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

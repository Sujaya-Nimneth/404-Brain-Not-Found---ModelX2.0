package com.modelx.atie.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.modelx.atie.client.ForecastClient;
import com.modelx.atie.client.MlServiceClient;
import com.modelx.atie.dto.MarketHistoryResponse;
import com.modelx.atie.entity.HistoricalPrice;
import com.modelx.atie.entity.Market;
import com.modelx.atie.repository.HistoricalPriceRepository;
import com.modelx.atie.repository.MarketRepository;

@Service
public class MarketHistoryService {
    private final HistoricalPriceRepository prices;
    private final MarketRepository markets;
    private final ForecastClient forecastClient;

    public MarketHistoryService(
            HistoricalPriceRepository prices,
            MarketRepository markets,
            ForecastClient forecastClient
    ) {
        this.prices = prices;
        this.markets = markets;
        this.forecastClient = forecastClient;
    }

    public MarketHistoryResponse history(
            String requestedMarketCode,
            String requestedCropCode,
            int requestedDays
    ) {
        if (requestedDays < 1 || requestedDays > 365) {
            throw new IllegalArgumentException("days must be between 1 and 365");
        }

        String marketCode = normalize(requestedMarketCode);
        String cropCode = normalize(requestedCropCode);
        Market market = markets.findByCode(marketCode).orElseThrow(
                () -> new NoSuchElementException("Unknown market: " + marketCode)
        );
        List<HistoricalPrice> newestFirst = prices
                .findByMarketCodeAndCropCodeOrderByRecordedDateDesc(
                        marketCode,
                        cropCode,
                        PageRequest.of(0, requestedDays)
                );
        if (newestFirst.isEmpty()) {
            throw new NoSuchElementException(
                    "No history for " + cropCode + " in " + marketCode
            );
        }

        List<HistoricalPrice> chronological = new ArrayList<>(newestFirst);
        chronological.sort(Comparator.comparing(HistoricalPrice::getRecordedDate));
        var referenceDate = chronological.get(chronological.size() - 1)
                .getRecordedDate();

        MlServiceClient.MlForecastResponse forecast48 = forecast(
                cropCode,
                48,
                referenceDate,
                marketCode
        );
        MlServiceClient.MlForecastResponse forecast72 = forecast(
                cropCode,
                72,
                referenceDate,
                marketCode
        );
        if (!forecast48.forecastSource().equals(forecast72.forecastSource())) {
            throw new IllegalStateException(
                    "Forecast trajectory mixed MODEL, FALLBACK, or DEMO_FIXTURE sources"
            );
        }

        return new MarketHistoryResponse(
                market.getCode(),
                market.getName(),
                cropCode,
                requestedDays,
                referenceDate,
                forecast48.forecastSource(),
                forecast48.modelVersion(),
                chronological.stream().map(record ->
                        new MarketHistoryResponse.HistoryPoint(
                                record.getRecordedDate(),
                                record.getWholesalePriceLkrPerKg(),
                                record.getArrivalVolumeTonnes()
                        )
                ).toList(),
                List.of(
                        trajectoryPoint(48, forecast48),
                        trajectoryPoint(72, forecast72)
                )
        );
    }

    private MlServiceClient.MlForecastResponse forecast(
            String cropCode,
            int horizonHours,
            java.time.LocalDate referenceDate,
            String marketCode
    ) {
        MlServiceClient.MlForecastResponse response = forecastClient.predictBatch(
                cropCode,
                horizonHours,
                referenceDate,
                List.of(marketCode),
                false
        );
        if (response.predictions() == null || response.predictions().isEmpty()) {
            throw new IllegalStateException(
                    "Forecast trajectory is unavailable for " + marketCode
            );
        }
        return response;
    }

    private MarketHistoryResponse.ForecastPoint trajectoryPoint(
            int horizonHours,
            MlServiceClient.MlForecastResponse forecast
    ) {
        var prediction = forecast.predictions().get(0);
        return new MarketHistoryResponse.ForecastPoint(
                horizonHours,
                prediction.predictedPriceLkr(),
                prediction.baselineNaiveLkr(),
                prediction.baselineMa7Lkr(),
                prediction.direction()
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }
}

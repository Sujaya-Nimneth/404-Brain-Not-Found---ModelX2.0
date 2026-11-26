package com.modelx.atie.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.modelx.atie.client.ForecastClient;
import com.modelx.atie.client.MlServiceClient;
import com.modelx.atie.client.MlServiceException;
import com.modelx.atie.dto.MarketHistoryResponse;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.HistoricalPriceRepository;
import com.modelx.atie.repository.MarketRepository;

@Service
public class MarketHistoryService {
    private final HistoryDataLoader dataLoader;
    private final ForecastClient forecastClient;

    @Autowired
    public MarketHistoryService(
            HistoryDataLoader dataLoader,
            ForecastClient forecastClient
    ) {
        this.dataLoader = dataLoader;
        this.forecastClient = forecastClient;
    }

    public MarketHistoryService(
            HistoricalPriceRepository prices,
            MarketRepository markets,
            CropRepository crops,
            ForecastClient forecastClient
    ) {
        this(new HistoryDataLoader(prices, markets, crops), forecastClient);
    }

    public MarketHistoryResponse history(
            String requestedMarketCode,
            String requestedCropCode,
            int requestedDays
    ) {
        return history(requestedMarketCode, requestedCropCode, requestedDays, false);
    }

    public MarketHistoryResponse history(
            String requestedMarketCode,
            String requestedCropCode,
            int requestedDays,
            boolean demoMode
    ) {
        if (requestedDays < 1 || requestedDays > 365) {
            throw new DomainValidationException(
                    "INVALID_DAYS",
                    "days must be between 1 and 365"
            );
        }

        String marketCode = normalize(requestedMarketCode);
        String cropCode = normalize(requestedCropCode);
        if (demoMode && !"TOMATO".equals(cropCode)) {
            throw new DomainValidationException(
                    "DEMO_FIXTURE_MISMATCH",
                    "Canonical demo trajectory is only available for TOMATO"
            );
        }

        HistoryDataLoader.LoadedHistory loaded = dataLoader.loadHistory(
                marketCode,
                cropCode,
                requestedDays
        );
        LocalDate referenceDate = loaded.referenceDate();

        MlServiceClient.MlForecastResponse forecast48 = forecast(
                cropCode,
                48,
                referenceDate,
                marketCode,
                demoMode
        );
        MlServiceClient.MlForecastResponse forecast72 = forecast(
                cropCode,
                72,
                referenceDate,
                marketCode,
                demoMode
        );
        if (!forecast48.forecastSource().equals(forecast72.forecastSource())) {
            if ("FALLBACK".equals(forecast72.forecastSource())) {
                forecast72 = forecast(cropCode, 72, referenceDate, marketCode, demoMode);
            }
            if (!forecast48.forecastSource().equals(forecast72.forecastSource())) {
                forecast48 = forecast(cropCode, 48, referenceDate, marketCode, demoMode);
            }
        }
        if (!forecast48.forecastSource().equals(forecast72.forecastSource())
                || !Objects.equals(forecast48.referenceDate(), forecast72.referenceDate())) {
            throw new MlServiceException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "TRAJECTORY_SOURCE_MISMATCH",
                    "Forecast trajectory changed source mid-request; please retry"
            );
        }

        return new MarketHistoryResponse(
                loaded.market().getCode(),
                loaded.market().getName(),
                cropCode,
                requestedDays,
                forecast48.referenceDate() != null
                        ? forecast48.referenceDate()
                        : referenceDate,
                forecast48.forecastSource(),
                forecast48.modelVersion(),
                loaded.records().stream().map(record ->
                        new MarketHistoryResponse.HistoryPoint(
                                record.getRecordedDate(),
                                scale2(record.getWholesalePriceLkrPerKg()),
                                scale2(record.getArrivalVolumeTonnes())
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
            LocalDate referenceDate,
            String marketCode,
            boolean demoMode
    ) {
        MlServiceClient.MlForecastResponse response = forecastClient.predictBatch(
                cropCode,
                horizonHours,
                referenceDate,
                List.of(marketCode),
                demoMode
        );
        if (response.predictions() == null || response.predictions().isEmpty()) {
            throw new MlServiceException(
                    HttpStatus.BAD_GATEWAY,
                    "ML_CONTRACT_ERROR",
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
                scale2(prediction.predictedPriceLkr()),
                scale2(prediction.baselineNaiveLkr()),
                scale2(prediction.baselineMa7Lkr()),
                prediction.direction()
        );
    }

    private java.math.BigDecimal scale2(java.math.BigDecimal value) {
        return value == null
                ? null
                : value.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }
}

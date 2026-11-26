package com.modelx.atie.service;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.modelx.atie.entity.HistoricalPrice;
import com.modelx.atie.entity.Market;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.HistoricalPriceRepository;
import com.modelx.atie.repository.MarketRepository;

@Service
public class HistoryDataLoader {
    private final HistoricalPriceRepository prices;
    private final MarketRepository markets;
    private final CropRepository crops;

    public HistoryDataLoader(
            HistoricalPriceRepository prices,
            MarketRepository markets,
            CropRepository crops
    ) {
        this.prices = prices;
        this.markets = markets;
        this.crops = crops;
    }

    @Transactional(readOnly = true)
    public LoadedHistory loadHistory(String marketCode, String cropCode, int requestedDays) {
        if (crops != null && crops.findByCode(cropCode).isEmpty()) {
            throw new DomainValidationException("UNKNOWN_CROP", "Unknown crop: " + cropCode);
        }
        Market market = markets.findByCode(marketCode).orElseThrow(
                () -> new NoSuchElementException("Unknown market: " + marketCode)
        );
        HistoricalPrice latest = prices
                .findTopByMarketCodeAndCropCodeOrderByRecordedDateDesc(marketCode, cropCode)
                .orElseThrow(() -> new NoSuchElementException(
                        "No history for " + cropCode + " in " + marketCode
                ));
        LocalDate startDate = latest.getRecordedDate().minusDays(requestedDays - 1L);
        List<HistoricalPrice> chronological = prices
                .findByMarketCodeAndCropCodeAndRecordedDateGreaterThanEqualOrderByRecordedDateAsc(
                        marketCode,
                        cropCode,
                        startDate
                );
        if (chronological.isEmpty()) {
            chronological = List.of(latest);
        }
        return new LoadedHistory(market, latest.getRecordedDate(), chronological);
    }

    public record LoadedHistory(
            Market market,
            LocalDate referenceDate,
            List<HistoricalPrice> records
    ) {
    }
}

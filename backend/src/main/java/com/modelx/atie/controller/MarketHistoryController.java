package com.modelx.atie.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.modelx.atie.entity.HistoricalPrice;
import com.modelx.atie.repository.HistoricalPriceRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/markets")
@Tag(name = "Markets", description = "Historical prices and forecast trajectory")
public class MarketHistoryController {
    private final HistoricalPriceRepository prices;

    public MarketHistoryController(HistoricalPriceRepository prices) {
        this.prices = prices;
    }

    @GetMapping("/{marketCode}/history")
    @Operation(summary = "Get recent wholesale history for a market and crop")
    public ResponseEntity<?> history(
            @PathVariable String marketCode,
            @RequestParam(defaultValue = "TOMATO") String cropCode,
            @RequestParam(defaultValue = "30") int days
    ) {
        if (days < 1 || days > 365) {
            return ResponseEntity.badRequest().body(
                    Map.of("code", "INVALID_DAYS", "message", "days must be between 1 and 365")
            );
        }
        List<HistoricalPrice> records = prices
                .findByMarketCodeAndCropCodeAndRecordedDateGreaterThanEqualOrderByRecordedDateAsc(
                        marketCode.trim().toUpperCase(),
                        cropCode.trim().toUpperCase(),
                        LocalDate.now().minusDays(days)
                );
        if (records.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
                "marketCode", marketCode.trim().toUpperCase(),
                "cropCode", cropCode.trim().toUpperCase(),
                "days", days,
                "history", records.stream().map(record -> Map.of(
                        "date", record.getRecordedDate(),
                        "priceLkrPerKg", record.getWholesalePriceLkrPerKg(),
                        "arrivalVolumeTonnes", record.getArrivalVolumeTonnes() == null
                                ? 0
                                : record.getArrivalVolumeTonnes()
                )).toList()
        ));
    }
}

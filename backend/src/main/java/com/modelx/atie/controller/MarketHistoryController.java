package com.modelx.atie.controller;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.modelx.atie.dto.MarketHistoryResponse;
import com.modelx.atie.service.MarketHistoryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/markets")
@Tag(name = "Markets", description = "Historical prices and forecast trajectory")
public class MarketHistoryController {
    private final MarketHistoryService history;

    public MarketHistoryController(MarketHistoryService history) {
        this.history = history;
    }

    @GetMapping("/{marketCode}/history")
    @Operation(summary = "Get recent history plus the 48h and 72h forecast trajectory")
    public ResponseEntity<MarketHistoryResponse> history(
            @PathVariable String marketCode,
            @RequestParam(name = "cropCode", defaultValue = "TOMATO") String cropCode,
            @RequestParam(name = "days", defaultValue = "30") int days
    ) {
        return ResponseEntity.ok(history.history(marketCode, cropCode, days));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalidRequest(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(
                Map.of("code", "INVALID_REQUEST", "message", error.getMessage())
        );
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException error) {
        return ResponseEntity.status(404).body(
                Map.of("code", "NOT_FOUND", "message", error.getMessage())
        );
    }
}

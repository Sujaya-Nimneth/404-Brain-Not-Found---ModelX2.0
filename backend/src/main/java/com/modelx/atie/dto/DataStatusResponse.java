package com.modelx.atie.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DataStatusResponse(
        @JsonProperty("overall_status") String overallStatus,
        @JsonProperty("generated_at") Instant generatedAt,
        List<SourceStatus> sources,
        @JsonProperty("price_coverage") List<PriceCoverage> priceCoverage
) {
    public record SourceStatus(
            @JsonProperty("source_code") String sourceCode,
            String label,
            @JsonProperty("data_state") String dataState,
            String freshness,
            @JsonProperty("last_attempt_at") Instant lastAttemptAt,
            @JsonProperty("last_success_at") Instant lastSuccessAt,
            @JsonProperty("latest_observation_date") LocalDate latestObservationDate,
            @JsonProperty("source_url") String sourceUrl,
            @JsonProperty("records_written") int recordsWritten,
            String message
    ) {
    }

    public record PriceCoverage(
            @JsonProperty("market_code") String marketCode,
            @JsonProperty("crop_code") String cropCode,
            @JsonProperty("latest_observation_date") LocalDate latestObservationDate,
            String source,
            String state
    ) {
    }
}

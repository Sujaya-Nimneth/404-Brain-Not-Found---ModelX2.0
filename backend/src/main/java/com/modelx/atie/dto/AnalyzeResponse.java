package com.modelx.atie.dto;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AnalyzeResponse(
        @JsonProperty("forecast_source") String forecastSource,
        @JsonProperty("model_version") String modelVersion,
        @JsonProperty("reference_date") LocalDate referenceDate,
        @JsonProperty("primary_directive") PrimaryDirective primaryDirective,
        @JsonProperty("market_comparisons") List<MarketComparison> marketComparisons,
        @JsonProperty("weather_alerts") List<WeatherAlert> weatherAlerts,
        @JsonProperty("model_evaluation_summary") ModelEvaluationSummary modelEvaluationSummary
) {
}

package com.modelx.atie.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.modelx.atie.dto.DataStatusResponse;

@Service
public class DataStatusService {
    private static final Set<String> SOURCES = Set.of("HDX", "CROPIX", "OPEN_METEO");
    private static final int MONTHLY_STALE_DAYS = 45;

    private final JdbcTemplate jdbc;

    public DataStatusService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public DataStatusResponse snapshot() {
        List<SourceRow> sourceRows = jdbc.query(
                """
                SELECT source_code, data_state, last_attempt_at, last_success_at,
                       latest_observation_date, source_url, records_written, message
                FROM data_source_status
                ORDER BY source_code
                """,
                (resultSet, rowNumber) -> sourceRow(resultSet)
        );
        List<CoverageRow> coverageRows = jdbc.query(
                """
                SELECT markets.code AS market_code,
                       crops.code AS crop_code,
                       latest.recorded_date,
                       latest.source
                FROM markets
                CROSS JOIN crops
                LEFT JOIN LATERAL (
                    SELECT historical_prices.recorded_date,
                           historical_prices.source
                    FROM historical_prices
                    WHERE historical_prices.market_id = markets.id
                      AND historical_prices.crop_id = crops.id
                    ORDER BY historical_prices.recorded_date DESC
                    LIMIT 1
                ) latest ON TRUE
                ORDER BY markets.code, crops.code
                """,
                (resultSet, rowNumber) -> new CoverageRow(
                        resultSet.getString("market_code"),
                        resultSet.getString("crop_code"),
                        resultSet.getObject("recorded_date", LocalDate.class),
                        resultSet.getString("source")
                )
        );
        Instant now = Instant.now();
        return build(
                sourceRows,
                coverageRows,
                LocalDate.ofInstant(now, ZoneOffset.UTC),
                now
        );
    }

    static DataStatusResponse build(
            List<SourceRow> sourceRows,
            List<CoverageRow> coverageRows,
            LocalDate today
    ) {
        return build(sourceRows, coverageRows, today, Instant.now());
    }

    static DataStatusResponse build(
            List<SourceRow> sourceRows,
            List<CoverageRow> coverageRows,
            LocalDate today,
            Instant now
    ) {
        Map<String, SourceRow> bySource = new LinkedHashMap<>();
        sourceRows.forEach(row -> bySource.put(row.sourceCode(), row));
        List<DataStatusResponse.SourceStatus> sources = new ArrayList<>();
        for (String sourceCode : SOURCES) {
            SourceRow row = bySource.get(sourceCode);
            if (row == null) {
                sources.add(new DataStatusResponse.SourceStatus(
                        sourceCode,
                        sourceCode.equals("OPEN_METEO") ? "Open-Meteo" : sourceCode,
                        "UNAVAILABLE",
                        "UNKNOWN",
                        null,
                        null,
                        null,
                        null,
                        0,
                        "No ingestion attempt has been recorded."
                ));
                continue;
            }
            sources.add(new DataStatusResponse.SourceStatus(
                    row.sourceCode(),
                    label(row.sourceCode()),
                    row.dataState(),
                    freshness(
                            row.sourceCode(),
                            row.latestObservationDate(),
                            row.lastSuccessAt(),
                            today,
                            now
                    ),
                    row.lastAttemptAt(),
                    row.lastSuccessAt(),
                    row.latestObservationDate(),
                    row.sourceUrl(),
                    row.recordsWritten(),
                    row.message()
            ));
        }
        sources.sort(Comparator.comparing(DataStatusResponse.SourceStatus::sourceCode));

        List<DataStatusResponse.PriceCoverage> coverage = coverageRows.stream()
                .map(row -> new DataStatusResponse.PriceCoverage(
                        row.marketCode(),
                        row.cropCode(),
                        row.latestObservationDate(),
                        row.source(),
                        coverageState(row.latestObservationDate(), row.source(), today)
                ))
                .toList();
        return new DataStatusResponse(
                overallStatus(sources),
                now,
                sources,
                coverage
        );
    }

    private static SourceRow sourceRow(ResultSet resultSet) throws SQLException {
        var attempt = resultSet.getTimestamp("last_attempt_at");
        var success = resultSet.getTimestamp("last_success_at");
        return new SourceRow(
                resultSet.getString("source_code"),
                resultSet.getString("data_state"),
                attempt == null ? null : attempt.toInstant(),
                success == null ? null : success.toInstant(),
                resultSet.getObject("latest_observation_date", LocalDate.class),
                resultSet.getString("source_url"),
                resultSet.getInt("records_written"),
                resultSet.getString("message")
        );
    }

    private static String overallStatus(List<DataStatusResponse.SourceStatus> sources) {
        long live = sources.stream()
                .filter(source -> "LIVE".equals(source.dataState()))
                .filter(source -> "CURRENT".equals(source.freshness()))
                .count();
        long fallback = sources.stream()
                .filter(source -> "CACHED".equals(source.dataState())
                        || "SEED".equals(source.dataState()))
                .count();
        if (live == sources.size()) {
            return "LIVE";
        }
        if (live > 0) {
            return "PARTIAL";
        }
        if (fallback > 0) {
            return "FALLBACK";
        }
        return "UNAVAILABLE";
    }

    private static String freshness(
            String sourceCode,
            LocalDate latestObservationDate,
            Instant lastSuccessAt,
            LocalDate today,
            Instant now
    ) {
        if (latestObservationDate == null) {
            return "UNKNOWN";
        }
        long age = ChronoUnit.DAYS.between(latestObservationDate, today);
        if ("OPEN_METEO".equals(sourceCode)) {
            if (lastSuccessAt != null
                    && Duration.between(lastSuccessAt, now).toHours() > 24) {
                return "STALE";
            }
            return age <= 1 ? "CURRENT" : "STALE";
        }
        return age <= MONTHLY_STALE_DAYS ? "CURRENT" : "STALE";
    }

    private static String coverageState(
            LocalDate latestObservationDate,
            String source,
            LocalDate today
    ) {
        if (latestObservationDate == null) {
            return "UNAVAILABLE";
        }
        if (source != null
                && ("SEED".equals(source) || source.endsWith("_SEED"))) {
            return "SEED";
        }
        if (source != null && source.endsWith("_CACHED")) {
            return "CACHED";
        }
        if (source != null && source.endsWith("_LIVE")) {
            return freshness("HDX", latestObservationDate, null, today, Instant.EPOCH);
        }
        return "UNKNOWN";
    }

    private static String label(String sourceCode) {
        return switch (sourceCode) {
            case "HDX" -> "WFP / HDX";
            case "CROPIX" -> "CROPIX";
            case "OPEN_METEO" -> "Open-Meteo";
            default -> sourceCode;
        };
    }

    record SourceRow(
            String sourceCode,
            String dataState,
            Instant lastAttemptAt,
            Instant lastSuccessAt,
            LocalDate latestObservationDate,
            String sourceUrl,
            int recordsWritten,
            String message
    ) {
    }

    record CoverageRow(
            String marketCode,
            String cropCode,
            LocalDate latestObservationDate,
            String source
    ) {
    }
}

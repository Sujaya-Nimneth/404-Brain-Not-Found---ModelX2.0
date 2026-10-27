package com.modelx.atie.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

class DataStatusServiceTest {
    @Test
    void oldHdxAndUnavailableCropixProducePartialStatus() {
        var result = DataStatusService.build(
                List.of(
                        new DataStatusService.SourceRow(
                                "HDX", "LIVE", Instant.now(), Instant.now(),
                                LocalDate.of(2021, 4, 15), "https://example.test/hdx",
                                101, "fetched"
                        ),
                        new DataStatusService.SourceRow(
                                "CROPIX", "UNAVAILABLE", Instant.now(), null,
                                null, null, 0, "not configured"
                        ),
                        new DataStatusService.SourceRow(
                                "OPEN_METEO", "LIVE", Instant.now(), Instant.now(),
                                LocalDate.of(2026, 10, 27), "https://example.test/weather",
                                49, "fetched"
                        )
                ),
                List.of(
                        new DataStatusService.CoverageRow(
                                "DAMBULLA", "TOMATO", LocalDate.of(2026, 10, 27), "HDX_SEED"
                        ),
                        new DataStatusService.CoverageRow(
                                "PETTAH_COLOMBO", "TOMATO", LocalDate.of(2021, 4, 15), "HDX_LIVE"
                        )
                ),
                LocalDate.of(2026, 10, 27)
        );

        assertThat(result.overallStatus()).isEqualTo("PARTIAL");
        assertThat(result.sources()).extracting("sourceCode")
                .containsExactly("CROPIX", "HDX", "OPEN_METEO");
        assertThat(result.sources()).filteredOn(source -> source.sourceCode().equals("HDX"))
                .singleElement()
                .extracting("freshness")
                .isEqualTo("STALE");
        assertThat(result.priceCoverage()).extracting("state")
                .containsExactly("SEED", "STALE");
    }

    @Test
    void noSourcesReturnsUnavailable() {
        var result = DataStatusService.build(List.of(), List.of(), LocalDate.of(2026, 10, 27));

        assertThat(result.overallStatus()).isEqualTo("UNAVAILABLE");
        assertThat(result.sources()).hasSize(3);
    }
}

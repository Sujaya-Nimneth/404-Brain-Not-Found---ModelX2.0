package com.modelx.atie;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.modelx.atie.dto.DataStatusResponse;
import com.modelx.atie.repository.CropRepository;
import com.modelx.atie.repository.MarketRouteRepository;
import com.modelx.atie.service.DataStatusService;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.datasource.url=${ATIE_TEST_DATABASE_URL}",
        "spring.datasource.username=${ATIE_TEST_DATABASE_USERNAME:atie}",
        "spring.datasource.password=${ATIE_TEST_DATABASE_PASSWORD:atie_dev_password}"
})
@EnabledIf("isDatabaseUrlConfigured")
@EnabledIfSystemProperty(named = "atie.postgres.integration", matches = "true")
class PostgresSchemaIntegrationTest {
    private static final Set<String> VALID_COVERAGE_STATES = Set.of(
            "SEED",
            "CACHED",
            "CURRENT",
            "STALE"
    );

    @Autowired
    private CropRepository crops;

    @Autowired
    private MarketRouteRepository routes;

    @Autowired
    private DataStatusService dataStatusService;

    static boolean isDatabaseUrlConfigured() {
        String env = System.getenv("ATIE_TEST_DATABASE_URL");
        if (env != null && !env.isBlank()) {
            return true;
        }
        String prop = System.getProperty("ATIE_TEST_DATABASE_URL");
        return prop != null && !prop.isBlank();
    }

    @Test
    void entityMappingsValidateAgainstPostgresSchema() {
        assertThat(crops.count()).isEqualTo(4);
        assertThat(routes.findByOriginCodeOrderByDistanceKmAsc("ANURADHAPURA"))
                .hasSize(7);
        DataStatusResponse status = dataStatusService.snapshot();
        assertThat(status.sources()).hasSize(3);
        assertThat(status.overallStatus())
                .isIn("LIVE", "PARTIAL", "FALLBACK");
        assertThat(status.priceCoverage()).hasSize(28)
                .allMatch(item -> VALID_COVERAGE_STATES.contains(item.state()));
    }
}

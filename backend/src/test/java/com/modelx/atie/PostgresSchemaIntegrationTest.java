package com.modelx.atie;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
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
        "spring.datasource.username=${ATIE_TEST_DATABASE_USERNAME}",
        "spring.datasource.password=${ATIE_TEST_DATABASE_PASSWORD}"
})
@EnabledIfEnvironmentVariable(named = "ATIE_TEST_DATABASE_URL", matches = ".+")
@EnabledIfSystemProperty(named = "atie.postgres.integration", matches = "true")
class PostgresSchemaIntegrationTest {
    @Autowired
    private CropRepository crops;

    @Autowired
    private MarketRouteRepository routes;

    @Autowired
    private DataStatusService dataStatusService;

    @Test
    void entityMappingsValidateAgainstPostgresSchema() {
        assertThat(crops.count()).isEqualTo(4);
        assertThat(routes.findByOriginCodeOrderByDistanceKmAsc("ANURADHAPURA"))
                .hasSize(7);
        DataStatusResponse status = dataStatusService.snapshot();
        assertThat(status.sources()).hasSize(3);
        assertThat(status.priceCoverage()).hasSize(28)
                .allMatch(item -> "SEED".equals(item.state()));
    }
}

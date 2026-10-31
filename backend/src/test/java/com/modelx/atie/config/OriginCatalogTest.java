package com.modelx.atie.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;

import com.fasterxml.jackson.databind.ObjectMapper;

class OriginCatalogTest {
    @Test
    void loadsVersionedOriginsFromClasspathConfiguration() {
        OriginCatalog catalog = new OriginCatalog();

        assertThat(catalog.version()).isEqualTo("1.0");
        assertThat(catalog.all()).extracting("code").containsExactly(
                "ANURADHAPURA",
                "JAFFNA",
                "DAMBULLA",
                "NUWARA_ELIYA",
                "THAMBUTTEGAMA"
        );
        assertThat(catalog.find("ANURADHAPURA"))
                .isPresent()
                .get()
                .satisfies(origin -> {
                    assertThat(origin.supplyZone()).isEqualTo("NORTHERN");
                    assertThat(origin.latitude()).isEqualByComparingTo("8.311400");
                });
    }

    @Test
    void rejectsDuplicateOriginCodesInConfiguration() {
        ByteArrayResource invalid = new ByteArrayResource("""
                {
                  "version": "1.0",
                  "origins": [
                    {
                      "code": "ANURADHAPURA",
                      "name": "Anuradhapura",
                      "district": "Anuradhapura",
                      "province": "North Central",
                      "latitude": 8.3114,
                      "longitude": 80.4037,
                      "supply_zone": "NORTHERN"
                    },
                    {
                      "code": "ANURADHAPURA",
                      "name": "Duplicate",
                      "district": "Anuradhapura",
                      "province": "North Central",
                      "latitude": 8.3114,
                      "longitude": 80.4037,
                      "supply_zone": "NORTHERN"
                    }
                  ]
                }
                """.getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> new OriginCatalog(new ObjectMapper(), invalid))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Duplicate origin code");
    }
}

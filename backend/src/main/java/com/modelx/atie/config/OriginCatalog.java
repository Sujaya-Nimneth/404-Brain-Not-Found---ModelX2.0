package com.modelx.atie.config;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.modelx.atie.domain.Origin;

@Component
public class OriginCatalog {
    private final List<Origin> origins = List.of(
            new Origin(
                    "ANURADHAPURA",
                    "Anuradhapura",
                    "Anuradhapura",
                    "North Central",
                    new BigDecimal("8.311400"),
                    new BigDecimal("80.403700"),
                    "NORTHERN"
            ),
            new Origin(
                    "JAFFNA",
                    "Jaffna",
                    "Jaffna",
                    "Northern",
                    new BigDecimal("9.661500"),
                    new BigDecimal("80.025500"),
                    "NORTHERN"
            ),
            new Origin(
                    "DAMBULLA",
                    "Dambulla",
                    "Matale",
                    "Central",
                    new BigDecimal("7.867500"),
                    new BigDecimal("80.651700"),
                    "CENTRAL"
            ),
            new Origin(
                    "NUWARA_ELIYA",
                    "Nuwara Eliya",
                    "Nuwara Eliya",
                    "Central",
                    new BigDecimal("6.949700"),
                    new BigDecimal("80.789100"),
                    "UPCOUNTRY"
            ),
            new Origin(
                    "THAMBUTTEGAMA",
                    "Thambuttegama",
                    "Anuradhapura",
                    "North Central",
                    new BigDecimal("8.150000"),
                    new BigDecimal("80.440000"),
                    "NORTH_CENTRAL"
            )
    );

    public List<Origin> all() {
        return origins;
    }

    public Optional<Origin> find(String code) {
        return origins.stream()
                .filter(origin -> origin.code().equals(code))
                .findFirst();
    }
}

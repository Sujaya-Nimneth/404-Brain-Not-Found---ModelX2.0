package com.modelx.atie.config;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.modelx.atie.domain.Origin;

@Component
public class OriginCatalog {
    private final String version;
    private final List<Origin> origins;

    public OriginCatalog() {
        this(
                new ObjectMapper().setPropertyNamingStrategy(
                        PropertyNamingStrategies.SNAKE_CASE
                ),
                new ClassPathResource("origins.json")
        );
    }

    @Autowired
    public OriginCatalog(ObjectMapper objectMapper) {
        this(objectMapper, new ClassPathResource("origins.json"));
    }

    OriginCatalog(ObjectMapper objectMapper, Resource resource) {
        OriginCatalogDocument document = load(objectMapper, resource);
        this.version = document.version();
        this.origins = List.copyOf(document.origins());
    }

    public String version() {
        return version;
    }

    public List<Origin> all() {
        return origins;
    }

    public Optional<Origin> find(String code) {
        return origins.stream()
                .filter(origin -> origin.code().equals(code))
                .findFirst();
    }

    private static OriginCatalogDocument load(
            ObjectMapper objectMapper,
            Resource resource
    ) {
        try (var input = resource.getInputStream()) {
            OriginCatalogDocument document = objectMapper
                    .copy()
                    .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                    .readValue(input, OriginCatalogDocument.class);
            validate(document);
            return document;
        } catch (IOException error) {
            throw new IllegalStateException(
                    "Origin configuration resource could not be loaded",
                    error
            );
        }
    }

    private static void validate(OriginCatalogDocument document) {
        if (document == null
                || document.version() == null
                || document.version().isBlank()
                || document.origins() == null
                || document.origins().isEmpty()) {
            throw new IllegalStateException(
                    "Origin configuration must define a version and non-empty origins"
            );
        }
        Set<String> codes = new HashSet<>();
        for (Origin origin : document.origins()) {
            if (origin == null
                    || blank(origin.code())
                    || blank(origin.name())
                    || blank(origin.district())
                    || blank(origin.province())
                    || blank(origin.supplyZone())
                    || origin.latitude() == null
                    || origin.longitude() == null) {
                throw new IllegalStateException(
                        "Origin configuration contains an incomplete entry"
                );
            }
            if (!codes.add(origin.code())) {
                throw new IllegalStateException(
                        "Duplicate origin code in configuration: " + origin.code()
                );
            }
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private record OriginCatalogDocument(
            String version,
            @JsonProperty("origins") List<Origin> origins
    ) {
    }
}

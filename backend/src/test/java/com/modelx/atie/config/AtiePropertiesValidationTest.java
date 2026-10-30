package com.modelx.atie.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import jakarta.validation.Validation;
import jakarta.validation.Validator;

class AtiePropertiesValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory()
            .getValidator();

    @Test
    void acceptsSafeProductionConfiguration() {
        assertThat(validator.validate(properties(
                "http://ml-service:8000",
                "5.0",
                "1000.00",
                "10.0",
                List.of("http://localhost:5173"),
                3,
                15
        ))).isEmpty();
    }

    @Test
    void rejectsUnsafeThresholdsUrlsAndTimeouts() {
        assertThat(validator.validate(properties(
                " ",
                "-1",
                "-1",
                "101",
                List.of(),
                0,
                0
        ))).hasSizeGreaterThanOrEqualTo(7);
    }

    private AtieProperties properties(
            String url,
            String safeMargin,
            String floor,
            String movement,
            List<String> origins,
            int connectTimeout,
            int readTimeout
    ) {
        return new AtieProperties(
                url,
                new BigDecimal(safeMargin),
                new BigDecimal(floor),
                new BigDecimal(movement),
                origins,
                "",
                connectTimeout,
                readTimeout
        );
    }
}

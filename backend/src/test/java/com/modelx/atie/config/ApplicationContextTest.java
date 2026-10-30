package com.modelx.atie.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class ApplicationContextTest {
    @Autowired
    private AtieProperties properties;

    @Test
    void bindsConfigurationPropertiesWhileStartingTheApplicationContext() {
        assertThat(properties.mlServiceUrl()).isEqualTo("http://localhost:18000");
        assertThat(properties.safeMarginPct()).isEqualByComparingTo("5.0");
        assertThat(properties.mlConnectTimeoutSeconds()).isEqualTo(1);
        assertThat(properties.mlReadTimeoutSeconds()).isEqualTo(5);
    }
}

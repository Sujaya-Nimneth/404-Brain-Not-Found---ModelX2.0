package com.modelx.atie.config;

import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;

@Configuration
public class JacksonConfig {
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer snakeCaseJson() {
        return builder -> builder.propertyNamingStrategy(
                PropertyNamingStrategies.SNAKE_CASE
        );
    }
}

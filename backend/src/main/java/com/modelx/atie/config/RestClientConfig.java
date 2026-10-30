package com.modelx.atie.config;

import java.time.Duration;

import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

@Configuration
public class RestClientConfig {
    @Bean
    RestClientCustomizer mlServiceTimeouts(AtieProperties properties) {
        return builder -> {
            SimpleClientHttpRequestFactory requestFactory =
                    new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(Duration.ofSeconds(
                    properties.mlConnectTimeoutSeconds()
            ));
            requestFactory.setReadTimeout(Duration.ofSeconds(
                    properties.mlReadTimeoutSeconds()
            ));
            builder.requestFactory(requestFactory);
        };
    }
}

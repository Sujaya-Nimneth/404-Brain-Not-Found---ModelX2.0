package com.modelx.atie.config;

import java.time.Duration;

import org.slf4j.MDC;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

@Configuration
public class RestClientConfig {
    @Bean
    public RestClientCustomizer mlServiceTimeouts(AtieProperties properties) {
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
            builder.requestInterceptor((request, body, execution) -> {
                String requestId = MDC.get(RequestIdFilter.MDC_KEY);
                if (requestId != null && !requestId.isBlank()
                        && !request.getHeaders().containsKey(RequestIdFilter.HEADER)) {
                    request.getHeaders().set(RequestIdFilter.HEADER, requestId);
                }
                return execution.execute(request, body);
            });
        };
    }
}

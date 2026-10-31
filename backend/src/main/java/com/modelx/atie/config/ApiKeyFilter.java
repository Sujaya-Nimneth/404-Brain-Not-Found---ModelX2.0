package com.modelx.atie.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class ApiKeyFilter extends OncePerRequestFilter {
    private static final String HEADER = "X-ATIE-API-Key";

    private final AtieProperties properties;

    public ApiKeyFilter(AtieProperties properties) {
        this.properties = properties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!properties.apiKeyRequired()) {
            return true;
        }
        String path = request.getRequestURI();
        return !path.startsWith("/api/")
                || "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.startsWith("/api/v1/metadata/data-status");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String supplied = request.getHeader(HEADER);
        if (supplied == null || !constantTimeEquals(properties.apiKey(), supplied)) {
            String requestId = MDC.get(RequestIdFilter.MDC_KEY);
            String requestIdJson = requestId != null
                    && requestId.matches("[A-Za-z0-9._-]{1,64}")
                    ? "\"" + requestId + "\""
                    : "null";
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"code\":\"UNAUTHORIZED\",\"message\":\"A valid X-ATIE-API-Key header is required.\",\"request_id\":"
                            + requestIdJson + "}"
            );
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean constantTimeEquals(String expected, String supplied) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                supplied.getBytes(StandardCharsets.UTF_8)
        );
    }
}

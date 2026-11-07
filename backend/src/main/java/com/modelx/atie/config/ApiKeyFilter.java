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
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
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
        String path = normalizePath(request);
        return !path.startsWith("/api/")
                || "OPTIONS".equalsIgnoreCase(request.getMethod())
                || "/api/v1/metadata/data-status".equals(path);
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

    static String normalizePath(HttpServletRequest request) {
        String raw = request.getRequestURI();
        if (raw == null || raw.isEmpty()) {
            return "/";
        }
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && raw.startsWith(contextPath)) {
            raw = raw.substring(contextPath.length());
        }
        StringBuilder cleaned = new StringBuilder(raw.length());
        boolean inMatrixParam = false;
        boolean prevSlash = false;
        for (int i = 0; i < raw.length(); i++) {
            char ch = raw.charAt(i);
            if (ch == ';') {
                inMatrixParam = true;
                continue;
            }
            if (ch == '/') {
                inMatrixParam = false;
                if (!prevSlash) {
                    cleaned.append('/');
                    prevSlash = true;
                }
                continue;
            }
            if (!inMatrixParam) {
                cleaned.append(ch);
                prevSlash = false;
            }
        }
        if (cleaned.length() > 1 && cleaned.charAt(cleaned.length() - 1) == '/') {
            cleaned.setLength(cleaned.length() - 1);
        }
        return cleaned.isEmpty() ? "/" : cleaned.toString();
    }

    private boolean constantTimeEquals(String expected, String supplied) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                supplied.getBytes(StandardCharsets.UTF_8)
        );
    }
}

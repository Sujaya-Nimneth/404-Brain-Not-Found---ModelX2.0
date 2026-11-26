package com.modelx.atie.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.regex.Pattern;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UriUtils;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class ApiKeyFilter extends OncePerRequestFilter {
    private static final String HEADER = "X-ATIE-API-Key";
    private static final Pattern REQUEST_ID_PATTERN = Pattern.compile("[A-Za-z0-9._-]{1,64}");

    private final AtieProperties properties;

    public ApiKeyFilter(AtieProperties properties) {
        this.properties = properties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!properties.apiKeyRequired()) {
            return true;
        }
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = normalizePath(request);
        if (path == null) {
            return false;
        }
        return "GET".equalsIgnoreCase(request.getMethod())
                && ("/api/v1/metadata/data-status".equals(path)
                        || "/actuator/health".equals(path));
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
                    && REQUEST_ID_PATTERN.matcher(requestId).matches()
                    ? "\"" + requestId + "\""
                    : "null";
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
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
        String lower = raw.toLowerCase(Locale.ROOT);
        if (lower.contains("%2f") || lower.contains("%5c") || raw.indexOf('\\') >= 0) {
            return null;
        }
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && raw.startsWith(contextPath)) {
            raw = raw.substring(contextPath.length());
        }
        String decoded;
        try {
            decoded = UriUtils.decode(raw, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException invalidEncoding) {
            return null;
        }

        StringBuilder stripped = new StringBuilder(decoded.length());
        boolean inMatrixParam = false;
        for (int i = 0; i < decoded.length(); i++) {
            char ch = decoded.charAt(i);
            if (ch == ';') {
                inMatrixParam = true;
                continue;
            }
            if (ch == '/') {
                inMatrixParam = false;
                stripped.append('/');
                continue;
            }
            if (!inMatrixParam) {
                stripped.append(ch);
            }
        }

        Deque<String> segments = new ArrayDeque<>();
        for (String segment : stripped.toString().split("/")) {
            if (segment.isEmpty() || ".".equals(segment)) {
                continue;
            }
            if ("..".equals(segment)) {
                if (!segments.isEmpty()) {
                    segments.removeLast();
                }
                continue;
            }
            segments.addLast(segment);
        }

        if (segments.isEmpty()) {
            return "/";
        }
        StringBuilder canonical = new StringBuilder();
        for (String segment : segments) {
            canonical.append('/').append(segment);
        }
        return canonical.toString();
    }

    private boolean constantTimeEquals(String expected, String supplied) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] expectedHash = digest.digest(expected.getBytes(StandardCharsets.UTF_8));
            byte[] suppliedHash = digest.digest(supplied.getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(expectedHash, suppliedHash);
        } catch (NoSuchAlgorithmException unavailable) {
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    supplied.getBytes(StandardCharsets.UTF_8)
            );
        }
    }
}

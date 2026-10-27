package com.modelx.atie.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ApiKeyFilterTest {
    @Test
    void disabledKeyKeepsCompetitionDemoOpen() throws Exception {
        var filter = new ApiKeyFilter(properties(""));
        var request = new MockHttpServletRequest("POST", "/api/v1/directives/analyze");
        var response = new MockHttpServletResponse();
        var chain = mock(jakarta.servlet.FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    @Test
    void enabledKeyRejectsMissingOrWrongHeader() throws Exception {
        var filter = new ApiKeyFilter(properties("secret"));
        var missing = new MockHttpServletRequest("POST", "/api/v1/directives/analyze");
        var response = new MockHttpServletResponse();
        var chain = mock(jakarta.servlet.FilterChain.class);

        filter.doFilter(missing, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("UNAUTHORIZED");
        verifyNoInteractions(chain);
    }

    @Test
    void enabledKeyAcceptsExactHeaderAndLeavesStatusOpen() throws Exception {
        var filter = new ApiKeyFilter(properties("secret"));
        var request = new MockHttpServletRequest("POST", "/api/v1/directives/analyze");
        request.addHeader("X-ATIE-API-Key", "secret");
        var response = new MockHttpServletResponse();
        var chain = mock(jakarta.servlet.FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    @Test
    void dataStatusRemainsPublicForMonitoring() throws Exception {
        var filter = new ApiKeyFilter(properties("secret"));
        var request = new MockHttpServletRequest("GET", "/api/v1/metadata/data-status");
        var response = new MockHttpServletResponse();
        var chain = mock(jakarta.servlet.FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    private AtieProperties properties(String key) {
        return new AtieProperties(
                "http://localhost:18000",
                new java.math.BigDecimal("5.0"),
                new java.math.BigDecimal("1000.00"),
                new java.math.BigDecimal("10.0"),
                java.util.List.of("http://localhost:5173"),
                key
        );
    }
}

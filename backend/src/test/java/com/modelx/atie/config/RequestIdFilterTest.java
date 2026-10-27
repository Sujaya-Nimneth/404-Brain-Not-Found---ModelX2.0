package com.modelx.atie.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestIdFilterTest {
    @Test
    void preservesSafeIncomingRequestId() throws Exception {
        var filter = new RequestIdFilter();
        var request = new MockHttpServletRequest();
        request.addHeader(RequestIdFilter.HEADER, "req-123");
        var response = new MockHttpServletResponse();
        var chain = mock(jakarta.servlet.FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(RequestIdFilter.HEADER)).isEqualTo("req-123");
        verify(chain).doFilter(request, response);
    }

    @Test
    void replacesUnsafeRequestId() throws Exception {
        var filter = new RequestIdFilter();
        var request = new MockHttpServletRequest();
        request.addHeader(RequestIdFilter.HEADER, "bad id with spaces");
        var response = new MockHttpServletResponse();
        var chain = mock(jakarta.servlet.FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(RequestIdFilter.HEADER))
                .matches("[0-9a-f-]{36}");
    }
}

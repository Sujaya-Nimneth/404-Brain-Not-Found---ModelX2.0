package com.modelx.atie.dto;

public record ApiErrorResponse(
        String code,
        String message,
        String requestId
) {
}

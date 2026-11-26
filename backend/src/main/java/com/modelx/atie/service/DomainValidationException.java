package com.modelx.atie.service;

public class DomainValidationException extends IllegalArgumentException {
    private final String code;

    public DomainValidationException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}

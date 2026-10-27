package com.modelx.atie.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.modelx.atie.dto.AnalyzeRequest;
import com.modelx.atie.dto.AnalyzeResponse;
import com.modelx.atie.service.ArbitrageRoutingService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/directives")
@Tag(name = "Directives", description = "Market routing and net-profit analysis")
public class DirectiveController {
    private final ArbitrageRoutingService routingService;

    public DirectiveController(ArbitrageRoutingService routingService) {
        this.routingService = routingService;
    }

    @PostMapping("/analyze")
    @Operation(summary = "Analyze a consignment and produce a safe routing directive")
    public AnalyzeResponse analyze(@Valid @RequestBody AnalyzeRequest request) {
        return routingService.analyze(request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleInvalidRequest(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(
                new ApiError("INVALID_REQUEST", error.getMessage())
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException error
    ) {
        String message = error.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(field -> field.getField() + ": " + field.getDefaultMessage())
                .orElse("Request validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiError("VALIDATION_ERROR", message));
    }

    public record ApiError(String code, String message) {
    }
}

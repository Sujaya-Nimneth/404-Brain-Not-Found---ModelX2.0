package com.modelx.atie.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.modelx.atie.dto.AnalyzeRequest;
import com.modelx.atie.dto.AnalyzeResponse;
import com.modelx.atie.dto.ApiErrorResponse;
import com.modelx.atie.service.ArbitrageRoutingService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Routing directive computed"),
            @ApiResponse(responseCode = "400", description = "Invalid consignment or route",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing or invalid API key",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "502", description = "Upstream ML contract error",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "503", description = "Forecast or fuel pricing unavailable",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public AnalyzeResponse analyze(@Valid @RequestBody AnalyzeRequest request) {
        return routingService.analyze(request);
    }
}

package com.modelx.atie.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.modelx.atie.dto.ApiErrorResponse;
import com.modelx.atie.dto.DataStatusResponse;
import com.modelx.atie.dto.MetadataConfigResponse;
import com.modelx.atie.service.DataStatusService;
import com.modelx.atie.service.MetadataService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/metadata")
@Tag(name = "Metadata", description = "Onboarding and scenario configuration")
public class MetadataController {
    private final MetadataService metadataService;
    private final DataStatusService dataStatus;

    public MetadataController(
            MetadataService metadataService,
            DataStatusService dataStatus
    ) {
        this.metadataService = metadataService;
        this.dataStatus = dataStatus;
    }

    @GetMapping("/config")
    @Operation(summary = "Get supported crops, origins, markets, vehicles, and fuel prices")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Configuration loaded"),
            @ApiResponse(
                    responseCode = "401",
                    description = "Missing or invalid API key",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))
            )
    })
    public MetadataConfigResponse config() {
        return metadataService.loadConfig();
    }

    @GetMapping("/data-status")
    @SecurityRequirements
    @Operation(summary = "Get live-data provenance, freshness, and price coverage")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Data provenance snapshot")
    })
    public DataStatusResponse dataStatus() {
        return dataStatus.snapshot();
    }
}

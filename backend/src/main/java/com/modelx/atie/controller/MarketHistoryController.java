package com.modelx.atie.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.modelx.atie.dto.ApiErrorResponse;
import com.modelx.atie.dto.MarketHistoryResponse;
import com.modelx.atie.service.MarketHistoryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Validated
@RestController
@RequestMapping("/api/v1/markets")
@Tag(name = "Markets", description = "Historical prices and forecast trajectory")
public class MarketHistoryController {
    private final MarketHistoryService history;

    public MarketHistoryController(MarketHistoryService history) {
        this.history = history;
    }

    @GetMapping("/{marketCode}/history")
    @Operation(summary = "Get recent history plus the 48h and 72h forecast trajectory")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Market history and trajectory returned"),
            @ApiResponse(responseCode = "400", description = "Invalid market, crop, or days parameter",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing or invalid API key",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Market or history not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "503", description = "Trajectory source mismatch or unavailable",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<MarketHistoryResponse> history(
            @Parameter(description = "Market code", example = "DAMBULLA")
            @PathVariable @NotBlank @Size(max = 64) String marketCode,
            @Parameter(description = "Crop code", example = "TOMATO")
            @RequestParam(name = "cropCode", defaultValue = "TOMATO") @NotBlank @Size(max = 64) String cropCode,
            @Parameter(description = "Calendar days of history (1-365)", example = "30")
            @RequestParam(name = "days", defaultValue = "30") @Min(1) @Max(365) int days,
            @Parameter(description = "Use canonical competition demo fixture trajectory")
            @RequestParam(name = "demoMode", defaultValue = "false") boolean demoMode
    ) {
        return ResponseEntity.ok(
                history.history(marketCode, cropCode, days, demoMode)
        );
    }

}

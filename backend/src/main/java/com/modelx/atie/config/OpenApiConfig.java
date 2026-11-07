package com.modelx.atie.config;

import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "ATIE Arbitrage & Market Routing API",
                version = "v1",
                description = "Sri Lanka Agricultural Trade & Intelligence Engine core REST contract."
        ),
        security = @SecurityRequirement(name = "AtieApiKey")
)
@SecurityScheme(
        name = "AtieApiKey",
        type = SecuritySchemeType.APIKEY,
        in = SecuritySchemeIn.HEADER,
        paramName = "X-ATIE-API-Key",
        description = "Optional deployment API key (leave empty when ATIE_API_KEY is unset)."
)
public class OpenApiConfig {
}

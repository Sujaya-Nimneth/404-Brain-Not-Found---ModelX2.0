package com.modelx.atie.client;

import java.time.LocalDate;
import java.util.List;

public interface ForecastClient {
    MlServiceClient.MlForecastResponse predictBatch(
            String cropCode,
            int horizonHours,
            LocalDate referenceDate,
            List<String> markets,
            boolean demoMode
    );
}

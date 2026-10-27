import type {
  AnalyzeRequest,
  AnalyzeResponse,
  MarketHistoryResponse,
  MetadataConfig,
} from "../types/atie";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

const fieldMap: Record<keyof AnalyzeRequest, string> = {
  originCode: "origin_code",
  defaultMarketCode: "default_market_code",
  cropCode: "crop_code",
  quantityKg: "quantity_kg",
  vehicleType: "vehicle_type",
  horizonHours: "horizon_hours",
  demoMode: "demo_mode",
};

function toApiRequest(request: AnalyzeRequest) {
  return Object.fromEntries(
    Object.entries(request).map(([key, value]) => [
      fieldMap[key as keyof AnalyzeRequest],
      value,
    ]),
  );
}

function mapResponse(payload: Record<string, unknown>): AnalyzeResponse {
  return {
    forecastSource: payload.forecast_source as AnalyzeResponse["forecastSource"],
    modelVersion: payload.model_version as string,
    referenceDate: payload.reference_date as string,
    primaryDirective: payload.primary_directive as AnalyzeResponse["primaryDirective"],
    marketComparisons: payload.market_comparisons as AnalyzeResponse["marketComparisons"],
    weatherAlerts: payload.weather_alerts as AnalyzeResponse["weatherAlerts"],
    modelEvaluationSummary:
      payload.model_evaluation_summary as AnalyzeResponse["modelEvaluationSummary"],
  };
}

export async function analyzeConsignment(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/directives/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiRequest(request)),
  });
  if (!response.ok) {
    throw new Error(
      `ATIE API ${response.status}: ${await response.text()}`,
    );
  }
  return mapResponse((await response.json()) as Record<string, unknown>);
}

export async function fetchMarketHistory(
  marketCode: string,
  cropCode: string,
  days = 14,
): Promise<MarketHistoryResponse> {
  const query = new URLSearchParams({
    cropCode,
    days: String(days),
  });
  const response = await fetch(
    `${API_BASE_URL}/markets/${encodeURIComponent(marketCode)}/history?${query}`,
  );
  if (!response.ok) {
    throw new Error(
      `ATIE history API ${response.status}: ${await response.text()}`,
    );
  }
  return (await response.json()) as MarketHistoryResponse;
}

export async function fetchMetadataConfig(): Promise<MetadataConfig> {
  const response = await fetch(`${API_BASE_URL}/metadata/config`);
  if (!response.ok) {
    throw new Error(
      `ATIE metadata API ${response.status}: ${await response.text()}`,
    );
  }
  return (await response.json()) as MetadataConfig;
}

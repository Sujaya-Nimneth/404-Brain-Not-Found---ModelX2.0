import type {
  AnalyzeRequest,
  AnalyzeResponse,
  DataStatus,
  MarketHistoryResponse,
  MetadataConfig,
} from "../types/atie";
import {
  mapAnalyzeResponse,
  mapDataStatus,
  mapMarketHistoryResponse,
  mapMetadataConfig,
} from "./mappers";

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

export class AtieApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly requestId: string | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "AtieApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function toApiRequest(request: AnalyzeRequest) {
  return Object.fromEntries(
    Object.entries(request).map(([key, value]) => [
      fieldMap[key as keyof AnalyzeRequest],
      value,
    ]),
  );
}

function authHeaders(contentType = false): HeadersInit {
  return contentType ? { "Content-Type": "application/json" } : {};
}

async function responseJson(
  response: Response,
  endpoint: string,
): Promise<unknown> {
  if (!response.ok) {
    throw await apiError(response, endpoint);
  }
  try {
    return await response.json();
  } catch {
    throw new AtieApiError(
      `${endpoint} returned malformed JSON.`,
      response.status,
    );
  }
}

async function apiError(
  response: Response,
  endpoint: string,
): Promise<AtieApiError> {
  let payload: Record<string, unknown> | null = null;
  try {
    const candidate = (await response.json()) as unknown;
    if (
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      payload = candidate as Record<string, unknown>;
    }
  } catch {
    // Some infrastructure errors return HTML or an empty body.
  }
  const message =
    typeof payload?.message === "string"
      ? payload.message
      : `${endpoint} failed with HTTP ${response.status}.`;
  return new AtieApiError(
    message,
    response.status,
    typeof payload?.code === "string" ? payload.code : null,
    typeof payload?.request_id === "string" ? payload.request_id : null,
  );
}

export async function analyzeConsignment(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/directives/analyze`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(toApiRequest(request)),
  });
  return mapAnalyzeResponse(
    await responseJson(response, "The directive analysis"),
  );
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
    { headers: authHeaders() },
  );
  return mapMarketHistoryResponse(
    await responseJson(response, "The market history request"),
  );
}

export async function fetchMetadataConfig(): Promise<MetadataConfig> {
  const response = await fetch(`${API_BASE_URL}/metadata/config`, {
    headers: authHeaders(),
  });
  return mapMetadataConfig(
    await responseJson(response, "The metadata request"),
  );
}

export async function fetchDataStatus(): Promise<DataStatus> {
  const response = await fetch(`${API_BASE_URL}/metadata/data-status`, {
    headers: authHeaders(),
  });
  return mapDataStatus(
    await responseJson(response, "The data provenance request"),
  );
}

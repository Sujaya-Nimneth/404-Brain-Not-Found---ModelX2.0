import Constants from "expo-constants";
import {
  ApiContractError,
  mapAnalyzeResponse,
  mapDataStatus,
  mapMarketHistoryResponse,
  mapMetadataConfig,
} from "../../../src/api/mappers";
import {
  demoRequest,
  demoResponse,
  getOfflineDemoHistory,
} from "../data/metadata";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  DataStatus,
  MarketHistoryResponse,
  MetadataConfig,
} from "../types/atie";
import { sameRequest } from "../utils/format";
import {
  ANDROID_EMULATOR_DIRECT_BACKEND_URL,
  ANDROID_EMULATOR_GATEWAY_URL,
  createRequestId,
  deriveDirectBackendFallbackUrl,
  extractLanHostFromExpoUri,
  normalizeBaseUrl,
  resolveDefaultAndroidBaseUrl,
} from "./endpointResolver";

export {
  ANDROID_EMULATOR_DIRECT_BACKEND_URL,
  ANDROID_EMULATOR_GATEWAY_URL,
  ApiContractError,
};

const expoHostUri = Constants.expoConfig?.hostUri ?? null;
const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? null;

export const AUTO_DETECTED_BASE_URL = resolveDefaultAndroidBaseUrl(
  envApiBaseUrl,
  expoHostUri,
);

let customApiBaseUrl: string | null = null;

export function setCustomApiBaseUrl(url: string | null): void {
  customApiBaseUrl =
    url && url.trim().length > 0 ? normalizeBaseUrl(url) : null;
}

export function getCustomApiBaseUrl(): string | null {
  return customApiBaseUrl;
}

export function getActiveApiBaseUrl(): string {
  return customApiBaseUrl ?? AUTO_DETECTED_BASE_URL;
}

export function getDetectedLanGatewayUrl(): string | null {
  const lanIp = extractLanHostFromExpoUri(expoHostUri);
  return lanIp ? `http://${lanIp}:15173/api/v1` : null;
}

export class AtieMobileApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly isNetworkError: boolean;

  constructor(
    message: string,
    options: {
      status?: number | null;
      code?: string | null;
      requestId?: string | null;
      isNetworkError?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "AtieMobileApiError";
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.requestId = options.requestId ?? null;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

const fieldMap: Record<keyof AnalyzeRequest, string> = {
  originCode: "origin_code",
  defaultMarketCode: "default_market_code",
  cropCode: "crop_code",
  quantityKg: "quantity_kg",
  vehicleType: "vehicle_type",
  horizonHours: "horizon_hours",
  demoMode: "demo_mode",
};

export function toApiRequest(
  request: AnalyzeRequest,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(request).map(([key, value]) => [
      fieldMap[key as keyof AnalyzeRequest],
      value,
    ]),
  );
}

function mergeAbortSignals(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    },
  };
}

async function parseErrorResponse(
  response: Response,
  endpointLabel: string,
): Promise<AtieMobileApiError> {
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
    // Non-JSON upstream error body.
  }
  const headerReqId = response.headers.get("X-Request-ID");
  const requestId =
    typeof payload?.request_id === "string"
      ? payload.request_id
      : headerReqId;
  const message =
    typeof payload?.message === "string"
      ? payload.message
      : `${endpointLabel} failed with HTTP ${response.status}.`;
  return new AtieMobileApiError(message, {
    status: response.status,
    code: typeof payload?.code === "string" ? payload.code : null,
    requestId,
    isNetworkError: false,
  });
}

async function fetchJsonWithGatewayFallback(
  path: string,
  init: RequestInit,
  endpointLabel: string,
  externalSignal?: AbortSignal,
  timeoutMs = 8000,
): Promise<unknown> {
  const primaryBase = getActiveApiBaseUrl();
  const fallbackBase =
    customApiBaseUrl === null
      ? deriveDirectBackendFallbackUrl(primaryBase)
      : null;
  const bases = fallbackBase ? [primaryBase, fallbackBase] : [primaryBase];

  let lastNetworkError: unknown = null;

  for (const base of bases) {
    const requestId = createRequestId();
    const { signal, cleanup } = mergeAbortSignals(externalSignal, timeoutMs);
    try {
      const response = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          "X-Request-ID": requestId,
          ...(init.headers ?? {}),
        },
        signal,
      });

      if (!response.ok) {
        throw await parseErrorResponse(response, endpointLabel);
      }

      try {
        return await response.json();
      } catch {
        throw new AtieMobileApiError(
          `${endpointLabel} returned malformed JSON.`,
          {
            status: response.status,
            requestId: response.headers.get("X-Request-ID") ?? requestId,
          },
        );
      }
    } catch (error) {
      if (externalSignal?.aborted) {
        throw error;
      }
      if (error instanceof AtieMobileApiError) {
        throw error;
      }
      lastNetworkError = error;
    } finally {
      cleanup();
    }
  }

  const detail =
    lastNetworkError instanceof Error && lastNetworkError.name === "AbortError"
      ? `Timed out reaching ATIE backend at ${primaryBase}.`
      : `Cannot reach ATIE backend at ${primaryBase}.`;

  throw new AtieMobileApiError(detail, {
    isNetworkError: true,
  });
}

export async function analyzeConsignment(
  request: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  try {
    const payload = await fetchJsonWithGatewayFallback(
      "/directives/analyze",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiRequest(request)),
      },
      "Directive analysis",
      signal,
    );
    return mapAnalyzeResponse(payload);
  } catch (error) {
    // Offline preview of the canonical competition fixture is allowed ONLY when
    // demoMode === true AND the request matches the registered canonical fixture.
    if (
      request.demoMode &&
      error instanceof AtieMobileApiError &&
      error.isNetworkError &&
      sameRequest(request, demoRequest)
    ) {
      return {
        ...demoResponse,
        analysisState: {
          kind: "demo",
          message:
            "Backend offline — showing the verified canonical competition fixture (DEMO_FIXTURE).",
        },
      };
    }
    throw error;
  }
}

export async function fetchMetadataConfig(
  signal?: AbortSignal,
): Promise<MetadataConfig> {
  const payload = await fetchJsonWithGatewayFallback(
    "/metadata/config",
    { method: "GET" },
    "Metadata configuration",
    signal,
    6000,
  );
  return mapMetadataConfig(payload);
}

export async function fetchDataStatus(
  signal?: AbortSignal,
): Promise<DataStatus> {
  const payload = await fetchJsonWithGatewayFallback(
    "/metadata/data-status",
    { method: "GET" },
    "Data provenance status",
    signal,
    6000,
  );
  return mapDataStatus(payload);
}

export async function fetchMarketHistory(
  marketCode: string,
  cropCode: string,
  days = 14,
  demoMode = false,
  signal?: AbortSignal,
): Promise<MarketHistoryResponse> {
  const query = new URLSearchParams({
    cropCode,
    days: String(days),
  });
  if (demoMode) {
    query.set("demoMode", "true");
  }
  try {
    const payload = await fetchJsonWithGatewayFallback(
      `/markets/${encodeURIComponent(marketCode)}/history?${query.toString()}`,
      { method: "GET" },
      "Market history",
      signal,
    );
    return mapMarketHistoryResponse(payload);
  } catch (error) {
    if (
      demoMode &&
      error instanceof AtieMobileApiError &&
      error.isNetworkError
    ) {
      const offlineDemo = getOfflineDemoHistory(marketCode, cropCode);
      if (offlineDemo) return offlineDemo;
    }
    throw error;
  }
}

export async function pingEndpointHealth(
  candidateBaseUrl: string,
): Promise<{ ok: boolean; statusText: string }> {
  const normalized = normalizeBaseUrl(candidateBaseUrl);
  const { signal, cleanup } = mergeAbortSignals(undefined, 4500);
  try {
    const response = await fetch(`${normalized}/metadata/data-status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Request-ID": createRequestId(),
      },
      signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        statusText: `HTTP ${response.status} from ${normalized}`,
      };
    }
    const status = mapDataStatus(await response.json());
    return {
      ok: true,
      statusText: `Connected (${status.overallStatus}) · ${normalized}`,
    };
  } catch {
    return {
      ok: false,
      statusText: `Unreachable · ${normalized}`,
    };
  } finally {
    cleanup();
  }
}

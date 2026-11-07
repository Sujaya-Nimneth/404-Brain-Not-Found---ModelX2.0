import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CachedResultSnapshot,
  LanguageCode,
  MetadataConfig,
} from "../types/atie";
import {
  DEFAULT_OFFLINE_CACHE_TTL_MS,
  findMatchingCachedResult,
  isCacheSnapshotFresh,
} from "../utils/format";

export { findMatchingCachedResult };

const KEYS = {
  language: "atie.android.v1.language",
  customEndpoint: "atie.android.v1.endpoint",
  customApiKey: "atie.android.v1.apiKey",
  metadata: "atie.android.v1.metadata",
  lastLiveResult: "atie.android.v1.lastLiveResult",
} as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateCachedMetadata(raw: unknown): MetadataConfig | null {
  if (!isPlainRecord(raw)) return null;
  if (
    !Array.isArray(raw.origins) ||
    !Array.isArray(raw.markets) ||
    !Array.isArray(raw.crops) ||
    !Array.isArray(raw.routes) ||
    !Array.isArray(raw.vehicleTypes) ||
    !Array.isArray(raw.horizons) ||
    !isPlainRecord(raw.thresholds) ||
    !isPlainRecord(raw.fuelPrices)
  ) {
    return null;
  }
  if (
    typeof raw.thresholds.safeMarginPct !== "number" ||
    typeof raw.thresholds.safeAbsoluteFloorLkr !== "number" ||
    typeof raw.thresholds.movementThresholdPct !== "number"
  ) {
    return null;
  }
  return raw as unknown as MetadataConfig;
}

function isValidAnalyzeRequest(raw: unknown): raw is AnalyzeRequest {
  if (!isPlainRecord(raw)) return false;
  return (
    typeof raw.originCode === "string" &&
    typeof raw.defaultMarketCode === "string" &&
    typeof raw.cropCode === "string" &&
    typeof raw.quantityKg === "number" &&
    Number.isFinite(raw.quantityKg) &&
    typeof raw.vehicleType === "string" &&
    (raw.horizonHours === 48 || raw.horizonHours === 72) &&
    typeof raw.demoMode === "boolean"
  );
}

function isValidAnalyzeResponse(raw: unknown): raw is AnalyzeResponse {
  if (!isPlainRecord(raw)) return false;
  if (raw.forecastSource !== "MODEL" && raw.forecastSource !== "FALLBACK") {
    return false;
  }
  if (
    raw.inputDataState !== "LIVE" &&
    raw.inputDataState !== "CACHED" &&
    raw.inputDataState !== "SEED"
  ) {
    return false;
  }
  if (
    typeof raw.modelVersion !== "string" ||
    typeof raw.referenceDate !== "string" ||
    !isPlainRecord(raw.primaryDirective) ||
    !Array.isArray(raw.marketComparisons) ||
    !Array.isArray(raw.weatherAlerts) ||
    !isPlainRecord(raw.modelEvaluationSummary)
  ) {
    return false;
  }
  const dir = raw.primaryDirective;
  return (
    (dir.severity === "CRITICAL_REROUTE" ||
      dir.severity === "PROCEED_DEFAULT" ||
      dir.severity === "HOLD_HARVEST") &&
    typeof dir.headline === "string" &&
    typeof dir.explanation === "string" &&
    typeof dir.defaultMarketCode === "string"
  );
}

export function validateCachedResultSnapshot(
  raw: unknown,
  nowMs = Date.now(),
  maxAgeMs = DEFAULT_OFFLINE_CACHE_TTL_MS,
): CachedResultSnapshot | null {
  if (!isPlainRecord(raw)) return null;
  if (typeof raw.cachedAt !== "string") return null;
  if (!isCacheSnapshotFresh(raw.cachedAt, nowMs, maxAgeMs)) return null;
  if (!isValidAnalyzeRequest(raw.request)) return null;
  if (!isValidAnalyzeResponse(raw.response)) return null;
  return {
    request: raw.request,
    response: raw.response,
    cachedAt: raw.cachedAt,
  };
}

export async function loadSavedLanguage(): Promise<LanguageCode | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.language);
    if (raw === "en" || raw === "si" || raw === "ta") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveLanguage(lang: LanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.language, lang);
  } catch {
    // Ignore storage write errors on restricted devices.
  }
}

export async function loadCustomEndpoint(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.customEndpoint);
    const trimmed = raw?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export async function saveCustomEndpoint(url: string | null): Promise<void> {
  try {
    if (!url || url.trim().length === 0) {
      await AsyncStorage.removeItem(KEYS.customEndpoint);
    } else {
      await AsyncStorage.setItem(
        KEYS.customEndpoint,
        url.trim().replace(/\/+$/, ""),
      );
    }
  } catch {
    // Ignore storage write errors.
  }
}

export async function loadCustomApiKey(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.customApiKey);
    const trimmed = raw?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export async function saveCustomApiKey(apiKey: string | null): Promise<void> {
  try {
    if (!apiKey || apiKey.trim().length === 0) {
      await AsyncStorage.removeItem(KEYS.customApiKey);
    } else {
      await AsyncStorage.setItem(KEYS.customApiKey, apiKey.trim());
    }
  } catch {
    // Ignore storage write errors.
  }
}

export async function loadCachedMetadata(): Promise<MetadataConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.metadata);
    if (!raw) return null;
    return validateCachedMetadata(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function saveCachedMetadata(
  config: MetadataConfig,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.metadata, JSON.stringify(config));
  } catch {
    // Ignore storage write errors.
  }
}

export async function loadCachedLiveResult(): Promise<CachedResultSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.lastLiveResult);
    if (!raw) return null;
    const validated = validateCachedResultSnapshot(JSON.parse(raw) as unknown);
    if (!validated) {
      await AsyncStorage.removeItem(KEYS.lastLiveResult);
    }
    return validated;
  } catch {
    return null;
  }
}

export async function saveCachedLiveResult(
  snapshot: CachedResultSnapshot,
): Promise<void> {
  if (snapshot.response.forecastSource === "DEMO_FIXTURE") {
    return;
  }
  try {
    await AsyncStorage.setItem(KEYS.lastLiveResult, JSON.stringify(snapshot));
  } catch {
    // Ignore storage write errors.
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CachedResultSnapshot,
  LanguageCode,
  MarketComparison,
  MetadataConfig,
  WeatherAlert,
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

type SecureStoreModule = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (!secureStorePromise) {
    secureStorePromise = import("expo-secure-store")
      .then((mod) => mod as unknown as SecureStoreModule)
      .catch(() => null);
  }
  return secureStorePromise;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateCachedMetadata(
  raw: unknown,
  nowMs = Date.now(),
  maxAgeMs = DEFAULT_OFFLINE_CACHE_TTL_MS,
): MetadataConfig | null {
  let candidate: unknown = raw;
  if (isPlainRecord(raw) && "config" in raw && "savedAt" in raw) {
    if (
      typeof raw.savedAt !== "string" ||
      !isCacheSnapshotFresh(raw.savedAt, nowMs, maxAgeMs)
    ) {
      return null;
    }
    candidate = raw.config;
  }

  if (!isPlainRecord(candidate)) return null;
  if (
    !Array.isArray(candidate.origins) ||
    !Array.isArray(candidate.markets) ||
    !Array.isArray(candidate.crops) ||
    !Array.isArray(candidate.routes) ||
    !Array.isArray(candidate.vehicleTypes) ||
    !Array.isArray(candidate.horizons) ||
    !isPlainRecord(candidate.thresholds) ||
    !isPlainRecord(candidate.fuelPrices)
  ) {
    return null;
  }
  if (
    !isFiniteNumber(candidate.thresholds.safeMarginPct) ||
    !isFiniteNumber(candidate.thresholds.safeAbsoluteFloorLkr) ||
    !isFiniteNumber(candidate.thresholds.movementThresholdPct)
  ) {
    return null;
  }
  return candidate as unknown as MetadataConfig;
}

function isValidAnalyzeRequest(raw: unknown): raw is AnalyzeRequest {
  if (!isPlainRecord(raw)) return false;
  return (
    typeof raw.originCode === "string" &&
    typeof raw.defaultMarketCode === "string" &&
    typeof raw.cropCode === "string" &&
    isFiniteNumber(raw.quantityKg) &&
    raw.quantityKg > 0 &&
    typeof raw.vehicleType === "string" &&
    (raw.horizonHours === 48 || raw.horizonHours === 72) &&
    typeof raw.demoMode === "boolean"
  );
}

function isValidMarketComparison(raw: unknown): raw is MarketComparison {
  if (!isPlainRecord(raw)) return false;
  return (
    typeof raw.marketCode === "string" &&
    typeof raw.marketName === "string" &&
    isFiniteNumber(raw.currentPriceLkr) &&
    isFiniteNumber(raw.predictedPriceLkr) &&
    isFiniteNumber(raw.grossRevenueLkr) &&
    isFiniteNumber(raw.transportCostLkr) &&
    isFiniteNumber(raw.spoilageLossLkr) &&
    isFiniteNumber(raw.handlingCostLkr) &&
    isFiniteNumber(raw.netProfitLkr) &&
    isFiniteNumber(raw.distanceKm) &&
    isFiniteNumber(raw.profitDeltaLkr) &&
    isFiniteNumber(raw.fuelLitres) &&
    isFiniteNumber(raw.trips) &&
    isFiniteNumber(raw.vehicleCapacityKg) &&
    typeof raw.recommended === "boolean" &&
    (raw.direction === "CRASH" ||
      raw.direction === "STABLE" ||
      raw.direction === "SURGE")
  );
}

function isValidWeatherAlert(raw: unknown): raw is WeatherAlert {
  if (!isPlainRecord(raw)) return false;
  return (
    typeof raw.marketCode === "string" &&
    (raw.riskLevel === "LOW" ||
      raw.riskLevel === "MEDIUM" ||
      raw.riskLevel === "HIGH") &&
    typeof raw.message === "string" &&
    isFiniteNumber(raw.precipitationMm) &&
    typeof raw.extremeWeather === "boolean" &&
    typeof raw.source === "string" &&
    typeof raw.observationDate === "string"
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
    !raw.marketComparisons.every(isValidMarketComparison) ||
    !Array.isArray(raw.weatherAlerts) ||
    !raw.weatherAlerts.every(isValidWeatherAlert) ||
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
    const secureStore = await getSecureStore();
    if (secureStore) {
      const secret = await secureStore.getItemAsync(KEYS.customApiKey);
      const trimmed = secret?.trim() ?? "";
      if (trimmed.length > 0) {
        await AsyncStorage.removeItem(KEYS.customApiKey).catch(() => {});
        return trimmed;
      }
      // Migrate legacy plaintext AsyncStorage key into SecureStore if present.
      const legacy = (await AsyncStorage.getItem(KEYS.customApiKey))?.trim() ?? "";
      if (legacy.length > 0) {
        await secureStore.setItemAsync(KEYS.customApiKey, legacy);
        await AsyncStorage.removeItem(KEYS.customApiKey);
        return legacy;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveCustomApiKey(apiKey: string | null): Promise<void> {
  try {
    const secureStore = await getSecureStore();
    await AsyncStorage.removeItem(KEYS.customApiKey).catch(() => {});
    if (!secureStore) return;
    if (!apiKey || apiKey.trim().length === 0) {
      await secureStore.deleteItemAsync(KEYS.customApiKey);
    } else {
      await secureStore.setItemAsync(KEYS.customApiKey, apiKey.trim());
    }
  } catch {
    // Ignore storage write errors.
  }
}

export async function loadCachedMetadata(): Promise<MetadataConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.metadata);
    if (!raw) return null;
    const validated = validateCachedMetadata(JSON.parse(raw) as unknown);
    if (!validated) {
      await AsyncStorage.removeItem(KEYS.metadata);
    }
    return validated;
  } catch {
    await AsyncStorage.removeItem(KEYS.metadata).catch(() => {});
    return null;
  }
}

export async function saveCachedMetadata(
  config: MetadataConfig,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEYS.metadata,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        config,
      }),
    );
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
    await AsyncStorage.removeItem(KEYS.lastLiveResult).catch(() => {});
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

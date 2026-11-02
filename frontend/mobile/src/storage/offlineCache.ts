import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  CachedResultSnapshot,
  LanguageCode,
  MetadataConfig,
} from "../types/atie";
import { findMatchingCachedResult } from "../utils/format";

export { findMatchingCachedResult };

const KEYS = {
  language: "atie.android.v1.language",
  customEndpoint: "atie.android.v1.endpoint",
  metadata: "atie.android.v1.metadata",
  lastLiveResult: "atie.android.v1.lastLiveResult",
} as const;

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

export async function loadCachedMetadata(): Promise<MetadataConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.metadata);
    if (!raw) return null;
    return JSON.parse(raw) as MetadataConfig;
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
    return JSON.parse(raw) as CachedResultSnapshot;
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

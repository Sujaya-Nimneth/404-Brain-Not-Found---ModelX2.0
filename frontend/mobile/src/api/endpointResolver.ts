export const ANDROID_EMULATOR_GATEWAY_URL = "http://10.0.2.2:15173/api/v1";
export const ANDROID_EMULATOR_DIRECT_BACKEND_URL = "http://10.0.2.2:8080/api/v1";

const IPV4_HOST_PATTERN =
  /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return ANDROID_EMULATOR_GATEWAY_URL;
  if (trimmed.endsWith("/api/v1")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
}

export function extractLanHostFromExpoUri(
  hostUri: string | null | undefined,
): string | null {
  if (!hostUri) return null;
  const cleaned = hostUri.trim().replace(/^[a-z]+:\/\//i, "");
  const host = cleaned.split("/")[0]?.split(":")[0]?.trim() ?? "";
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "10.0.2.2") {
    return null;
  }
  if (IPV4_HOST_PATTERN.test(host)) {
    return host;
  }
  return null;
}

export function resolveDefaultAndroidBaseUrl(
  envUrl?: string | null,
  expoHostUri?: string | null,
): string {
  if (envUrl && envUrl.trim().length > 0) {
    return normalizeBaseUrl(envUrl);
  }
  const lanIp = extractLanHostFromExpoUri(expoHostUri);
  if (lanIp) {
    return `http://${lanIp}:15173/api/v1`;
  }
  return ANDROID_EMULATOR_GATEWAY_URL;
}

/**
 * If an auto-resolved Docker Nginx gateway URL (:15173) is unreachable
 * (e.g. developer started Spring Boot directly via mvn spring-boot:run on :8080),
 * derive the direct :8080 fallback on the exact same host.
 */
export function deriveDirectBackendFallbackUrl(baseUrl: string): string | null {
  const match = baseUrl.match(/^(https?:\/\/[^:/]+):15173(\/api\/v1)$/);
  if (!match) return null;
  return `${match[1]}:8080${match[2]}`;
}

export function createRequestId(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `atie-android-${stamp}-${rand}`;
}

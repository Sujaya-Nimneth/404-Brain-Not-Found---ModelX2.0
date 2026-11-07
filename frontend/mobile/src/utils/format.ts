import type { AnalyzeRequest, CachedResultSnapshot } from "../types/atie";

export const DEFAULT_OFFLINE_CACHE_TTL_MS = 72 * 60 * 60 * 1000;

export function roundHalfUp(value: number, fractionDigits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** fractionDigits;
  const sign = value < 0 ? -1 : 1;
  return (
    (sign * Math.floor(Math.abs(value) * factor + 0.5 + 1e-12)) / factor
  );
}

export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = roundHalfUp(value, 0);
  try {
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rounded);
  } catch {
    return rounded.toFixed(0);
  }
}

export function formatLkr(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = roundHalfUp(value, fractionDigits);
  try {
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(rounded);
  } catch {
    return rounded.toFixed(fractionDigits);
  }
}

export function formatCurrency(amount: number, fractionDigits = 2): string {
  if (!Number.isFinite(amount)) return "—";
  const rounded = roundHalfUp(amount, fractionDigits);
  if (rounded < 0) {
    return `-LKR ${formatLkr(Math.abs(rounded), fractionDigits)}`;
  }
  return `LKR ${formatLkr(rounded, fractionDigits)}`;
}

export function formatSignedLkr(
  value: number | null,
  fractionDigits = 2,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = roundHalfUp(value, fractionDigits);
  if (rounded > 0) return `+${formatLkr(rounded, fractionDigits)}`;
  if (rounded < 0) return `-${formatLkr(Math.abs(rounded), fractionDigits)}`;
  return formatLkr(0, fractionDigits);
}

export function formatSignedCurrency(
  value: number | null,
  fractionDigits = 2,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = roundHalfUp(value, fractionDigits);
  if (rounded > 0) return `+LKR ${formatLkr(rounded, fractionDigits)}`;
  if (rounded < 0) return `-LKR ${formatLkr(Math.abs(rounded), fractionDigits)}`;
  return `LKR ${formatLkr(0, fractionDigits)}`;
}

export function formatSignedPct(
  value: number | null,
  fractionDigits = 2,
): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const rounded = roundHalfUp(value, fractionDigits);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(fractionDigits)}%`;
}

export function formatMetricPct(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${roundHalfUp(value, fractionDigits).toFixed(fractionDigits)}%`;
}

export function formatMetricLkr(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${roundHalfUp(value, fractionDigits).toFixed(fractionDigits)} LKR`;
}

export function parseCacheTimestampMs(cachedAt: string | null | undefined): number | null {
  if (!cachedAt || typeof cachedAt !== "string") return null;
  const trimmed = cachedAt.trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed.replace(" ", "T")}:00Z`
    : trimmed;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isCacheSnapshotFresh(
  cachedAt: string | null | undefined,
  nowMs = Date.now(),
  maxAgeMs = DEFAULT_OFFLINE_CACHE_TTL_MS,
): boolean {
  const savedMs = parseCacheTimestampMs(cachedAt);
  if (savedMs === null) return false;
  return nowMs - savedMs <= maxAgeMs;
}

export function sameRequest(
  left: AnalyzeRequest,
  right: AnalyzeRequest,
): boolean {
  return (
    left.originCode === right.originCode &&
    left.defaultMarketCode === right.defaultMarketCode &&
    left.cropCode === right.cropCode &&
    left.quantityKg === right.quantityKg &&
    left.vehicleType === right.vehicleType &&
    left.horizonHours === right.horizonHours &&
    left.demoMode === right.demoMode
  );
}

export function findMatchingCachedResult(
  snapshot: CachedResultSnapshot | null,
  request: AnalyzeRequest,
  nowMs = Date.now(),
  maxAgeMs = DEFAULT_OFFLINE_CACHE_TTL_MS,
): CachedResultSnapshot | null {
  if (!snapshot) return null;
  if (snapshot.response.forecastSource === "DEMO_FIXTURE") return null;
  if (!isCacheSnapshotFresh(snapshot.cachedAt, nowMs, maxAgeMs)) return null;
  return sameRequest(snapshot.request, request) ? snapshot : null;
}

export function computeTripsAndLoad(
  quantityKg: number,
  vehicleCapacityKg: number,
): { trips: number; loadUtilizationPct: number } {
  if (quantityKg <= 0 || vehicleCapacityKg <= 0) {
    return { trips: 1, loadUtilizationPct: 0 };
  }
  const trips = Math.ceil(quantityKg / vehicleCapacityKg);
  const totalCapacity = trips * vehicleCapacityKg;
  const loadUtilizationPct = Math.round((quantityKg / totalCapacity) * 100);
  return { trips, loadUtilizationPct };
}

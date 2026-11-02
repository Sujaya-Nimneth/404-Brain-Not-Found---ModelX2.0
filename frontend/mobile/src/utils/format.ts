import type { AnalyzeRequest, CachedResultSnapshot } from "../types/atie";

export function formatLkr(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return value.toFixed(fractionDigits);
  }
}

export function formatCurrency(amount: number, fractionDigits = 0): string {
  if (!Number.isFinite(amount)) return "—";
  if (amount < 0) {
    return `-LKR ${formatLkr(Math.abs(amount), fractionDigits)}`;
  }
  return `LKR ${formatLkr(amount, fractionDigits)}`;
}

export function formatSignedLkr(
  value: number | null,
  fractionDigits = 0,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value > 0) return `+${formatLkr(value, fractionDigits)}`;
  if (value < 0) return `-${formatLkr(Math.abs(value), fractionDigits)}`;
  return formatLkr(0, fractionDigits);
}

export function formatSignedCurrency(
  value: number | null,
  fractionDigits = 0,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value > 0) return `+LKR ${formatLkr(value, fractionDigits)}`;
  if (value < 0) return `-LKR ${formatLkr(Math.abs(value), fractionDigits)}`;
  return `LKR ${formatLkr(0, fractionDigits)}`;
}

export function formatSignedPct(
  value: number | null,
  fractionDigits = 2,
): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

export function formatMetricPct(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatMetricLkr(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(fractionDigits)} LKR`;
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
): CachedResultSnapshot | null {
  if (!snapshot) return null;
  if (snapshot.response.forecastSource === "DEMO_FIXTURE") return null;
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

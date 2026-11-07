export function roundHalfUp2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}

export function formatFixed2(value: number): string {
  return roundHalfUp2(value).toFixed(2);
}

export function formatLkr(value: number): string {
  return new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundHalfUp2(value));
}

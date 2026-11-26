const lkrFormatter = new Intl.NumberFormat("en-LK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function roundHalfUp2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const abs = Math.abs(value);
  const shifted = Number(`${abs}e2`);
  const rounded = Number.isFinite(shifted)
    ? Math.round(shifted + 1e-12) / 100
    : Math.round(abs * 100 + 1e-12) / 100;
  if (rounded === 0) return 0;
  return value < 0 ? -rounded : rounded;
}

export function formatFixed2(value: number): string {
  return roundHalfUp2(value).toFixed(2);
}

export function formatLkr(value: number): string {
  return lkrFormatter.format(roundHalfUp2(value));
}

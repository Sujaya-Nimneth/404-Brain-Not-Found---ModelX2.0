export function formatLkr(value: number): string {
  try {
    return new Intl.NumberFormat("en-LK", {
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return Math.round(value).toLocaleString();
  }
}

export function formatCurrency(amount: number): string {
  return `LKR ${formatLkr(amount)}`;
}

export function formatPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

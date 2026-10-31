import type { MarketComparison } from "../types/atie";

export function formatUpliftLabel(market: MarketComparison): string {
  if (
    market.profitDeltaLkr === 0 &&
    (market.profitUpliftPct === 0 || market.profitUpliftPct === null)
  ) {
    return "baseline";
  }
  if (market.profitUpliftPct === null) {
    return "n/a";
  }
  const sign = market.profitUpliftPct > 0 ? "+" : "";
  return `${sign}${market.profitUpliftPct.toFixed(1)}%`;
}

export function shortMarketName(name: string): string {
  if (name.includes("Pettah")) return "Pettah";
  if (name.includes("Nuwara Eliya")) return "N. Eliya";
  return name.split(" ")[0];
}

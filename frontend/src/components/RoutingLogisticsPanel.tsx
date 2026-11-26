import { memo } from "react";
import { Fuel, MapPinned, Route, WalletCards } from "lucide-react";
import type { MarketComparison } from "../types/atie";
import { formatFixed2, formatLkr } from "../utils/format";

interface Props {
  markets: MarketComparison[];
  defaultMarketCode?: string;
}

function resolvePriceChangePct(market: MarketComparison): number {
  if (market.pctChange !== undefined && market.pctChange !== null) {
    return market.pctChange;
  }
  return (
    ((market.predictedPriceLkr - market.currentPriceLkr) /
      market.currentPriceLkr) *
    100
  );
}

export const RoutingLogisticsPanel = memo(function RoutingLogisticsPanel({
  markets,
  defaultMarketCode,
}: Props) {
  return (
    <section
      aria-label="Route ledger"
      className="rise-in rounded-[2rem] border border-ink/10 bg-cream/90 p-5 shadow-card md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Route ledger
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Every rupee accounted for.
          </h2>
          <p className="mt-1 text-xs text-ink/70">
            Gross revenue already reflects effective post-spoilage volume sold;
            spoilage is shown separately for cost transparency.
          </p>
        </div>
        <span className="rounded-full bg-[#ebe5d8] px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink/75">
          ranked by net profit
        </span>
      </div>

      {markets.length === 0 ? (
        <div
          role="status"
          className="mt-5 rounded-2xl border border-dashed border-ink/15 bg-white/40 p-6 text-center text-sm text-ink/70"
        >
          No market route comparisons are available for this consignment.
        </div>
      ) : (
        <div className="mt-5 -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[66rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/15 font-mono text-[0.6875rem] uppercase tracking-[0.11em] text-ink/70">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-[#f6f1e4] px-2 py-3 font-medium"
                >
                  Market
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Spot → Forecast
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Round trip
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Vehicle load
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Post-spoilage gross
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Fuel
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Spoilage loss
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Handling
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  vs default
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Net profit
                </th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => {
                const pctChange = resolvePriceChangePct(market);
                const pctSign = pctChange > 0 ? "+" : "";
                const isDefault =
                  defaultMarketCode !== undefined &&
                  market.marketCode === defaultMarketCode;
                const directionTone =
                  market.direction === "CRASH"
                    ? "text-[#8b3e2b]"
                    : market.direction === "SURGE"
                      ? "text-moss"
                      : "text-ink/70";
                const stickyRowBg = market.recommended
                  ? "bg-[#e9efca]"
                  : "bg-[#f8f4ea]";
                return (
                  <tr
                    key={market.marketCode}
                    className={`border-b border-ink/10 text-sm transition ${
                      market.recommended
                        ? "bg-lime/30"
                        : "hover:bg-ink/[0.025]"
                    }`}
                  >
                    <td className={`sticky left-0 z-10 px-2 py-4 ${stickyRowBg}`}>
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                            market.recommended
                              ? "bg-moss text-lime"
                              : "bg-ink/10 text-ink/70"
                          }`}
                        >
                          <MapPinned className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="font-bold text-ink">
                            {market.marketName}
                          </p>
                          <p className="text-[0.6875rem] text-ink/70">
                            {isDefault
                              ? `Default · ${market.direction.toLowerCase()}`
                              : market.recommended
                                ? "Recommended"
                                : market.direction.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 font-mono text-xs text-ink/80">
                      <p>
                        {formatFixed2(market.currentPriceLkr)} →{" "}
                        <strong className="text-ink">
                          {formatFixed2(market.predictedPriceLkr)}
                        </strong>
                      </p>
                      <p
                        className={`mt-1 text-[0.6875rem] font-semibold ${directionTone}`}
                      >
                        {pctSign}
                        {formatFixed2(pctChange)}% LKR/kg
                      </p>
                    </td>
                    <td className="px-2 py-4 font-mono text-xs text-ink/75">
                      <span className="inline-flex items-center gap-1.5">
                        <Route
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-ink/50"
                        />
                        {(market.distanceKm * 2).toFixed(0)} km
                      </span>
                      <p className="mt-1 pl-5 text-[0.6875rem] text-ink/65">
                        {market.distanceKm.toFixed(0)} km one way
                      </p>
                    </td>
                    <td className="px-2 py-4 font-mono text-xs text-ink/75">
                      <p>
                        {market.trips} {market.trips === 1 ? "trip" : "trips"}
                      </p>
                      <p className="mt-1 text-[0.6875rem] text-ink/65">
                        {formatKg(market.vehicleCapacityKg)} capacity
                      </p>
                    </td>
                    <td className="px-2 py-4 font-mono text-xs text-ink/80">
                      <p>{formatLkr(market.grossRevenueLkr)}</p>
                      {market.effectiveVolumeKg != null && (
                        <p className="mt-1 text-[0.6875rem] text-ink/65">
                          {formatFixed2(market.effectiveVolumeKg)} kg sold
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-4 font-mono text-xs text-ink/75">
                      <span className="inline-flex items-center gap-1.5">
                        <Fuel
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-ink/50"
                        />
                        {formatLkr(market.transportCostLkr)}
                      </span>
                      <p className="mt-1 pl-5 text-[0.6875rem] text-ink/65">
                        {market.fuelLitres.toFixed(1)} L
                      </p>
                    </td>
                    <td className="px-2 py-4 font-mono text-xs text-ink/75">
                      {formatLkr(market.spoilageLossLkr)}
                    </td>
                    <td className="px-2 py-4 font-mono text-xs text-ink/75">
                      {formatLkr(market.handlingCostLkr)}
                    </td>
                    <td
                      className={`px-2 py-4 font-mono text-xs font-semibold ${
                        market.profitDeltaLkr > 0
                          ? "text-moss"
                          : market.profitDeltaLkr < 0
                            ? "text-[#8b3e2b]"
                            : "text-ink/70"
                      }`}
                    >
                      {isDefault || market.profitDeltaLkr === 0
                        ? isDefault && market.profitDeltaLkr === 0
                          ? "baseline"
                          : market.profitDeltaLkr === 0
                            ? "0.00"
                            : formatSignedLkr(market.profitDeltaLkr)
                        : formatSignedLkr(market.profitDeltaLkr)}
                    </td>
                    <td className="px-2 py-4">
                      <p
                        className={`inline-flex items-center gap-1.5 font-display text-lg font-semibold ${
                          market.recommended ? "text-moss" : "text-ink"
                        }`}
                      >
                        <WalletCards
                          aria-hidden="true"
                          className="h-4 w-4 opacity-60"
                        />
                        {formatLkr(market.netProfitLkr)}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

function formatKg(value: number) {
  return `${new Intl.NumberFormat("en-LK", {
    maximumFractionDigits: 0,
  }).format(value)} kg`;
}

function formatSignedLkr(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatLkr(value)}`;
}

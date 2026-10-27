import { Fuel, MapPinned, Route, WalletCards } from "lucide-react";
import type { MarketComparison } from "../types/atie";
import { formatLkr } from "./PrimaryDirectiveCard";

interface Props {
  markets: MarketComparison[];
}

export function RoutingLogisticsPanel({ markets }: Props) {
  return (
    <section className="rise-in rounded-[2rem] border border-ink/10 bg-cream/90 p-5 shadow-card md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Route ledger
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Every rupee accounted for.
          </h2>
        </div>
        <span className="rounded-full bg-[#ebe5d8] px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink/55">
          ranked by net profit
        </span>
      </div>

      <div className="mt-5 -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[46rem] border-collapse text-left lg:min-w-full">
          <thead>
            <tr className="border-b border-ink/15 font-mono text-[0.58rem] uppercase tracking-[0.13em] text-ink/45">
              <th className="px-2 py-3 font-medium">Market</th>
              <th className="px-2 py-3 font-medium">Distance</th>
              <th className="px-2 py-3 font-medium">Fuel</th>
              <th className="px-2 py-3 font-medium">Spoilage</th>
              <th className="px-2 py-3 font-medium">Handling</th>
              <th className="px-2 py-3 font-medium">Net profit</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => (
              <tr
                key={market.marketCode}
                className={`border-b border-ink/8 text-sm transition ${
                  market.recommended
                    ? "bg-lime/30"
                    : "hover:bg-ink/[0.025]"
                }`}
              >
                <td className="px-2 py-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full ${
                        market.recommended
                          ? "bg-moss text-lime"
                          : "bg-ink/5 text-ink/50"
                      }`}
                    >
                      <MapPinned className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="font-bold text-ink">{market.marketName}</p>
                      <p className="text-[0.65rem] text-ink/45">
                        {market.recommended
                          ? "Recommended"
                          : market.direction.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-4 font-mono text-xs text-ink/65">
                  <span className="inline-flex items-center gap-1.5">
                    <Route className="h-3.5 w-3.5 text-ink/35" />
                    {market.distanceKm.toFixed(0)} km
                  </span>
                </td>
                <td className="px-2 py-4 font-mono text-xs text-ink/65">
                  <span className="inline-flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-ink/35" />
                    {formatLkr(market.transportCostLkr)}
                  </span>
                </td>
                <td className="px-2 py-4 font-mono text-xs text-ink/65">
                  {formatLkr(market.spoilageLossLkr)}
                </td>
                <td className="px-2 py-4 font-mono text-xs text-ink/65">
                  {formatLkr(market.handlingCostLkr)}
                </td>
                <td className="px-2 py-4">
                  <p
                    className={`inline-flex items-center gap-1.5 font-display text-lg font-semibold ${
                      market.recommended ? "text-moss" : "text-ink"
                    }`}
                  >
                    <WalletCards className="h-4 w-4 opacity-40" />
                    {formatLkr(market.netProfitLkr)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

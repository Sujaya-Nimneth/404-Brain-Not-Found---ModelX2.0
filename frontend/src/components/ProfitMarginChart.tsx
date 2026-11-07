import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketComparison } from "../types/atie";
import { formatLkr, roundHalfUp2 } from "../utils/format";
import { formatUpliftLabel, shortMarketName } from "./profitFormat";

interface Props {
  markets: MarketComparison[];
}

export function ProfitMarginChart({ markets }: Props) {
  const sortedMarkets = [...markets].sort(
    (a, b) => b.netProfitLkr - a.netProfitLkr,
  );
  const chartData = sortedMarkets.map((market) => ({
    name: shortMarketName(market.marketName),
    netProfit: roundHalfUp2(market.netProfitLkr),
    cashDeductions: roundHalfUp2(
      market.transportCostLkr + market.handlingCostLkr,
    ),
    grossRevenue: roundHalfUp2(market.grossRevenueLkr),
    spoilageLoss: roundHalfUp2(market.spoilageLossLkr),
    recommended: market.recommended,
    marketCode: market.marketCode,
  }));

  return (
    <section className="rise-in rise-in-delay-2 rounded-[2rem] border border-ink/10 bg-cream/90 p-5 shadow-card md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Market economics
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Profit after the road.
          </h2>
          <p className="mt-1 text-xs text-ink/55">
            Net profit equals post-spoilage gross revenue minus round-trip fuel
            and market handling fees.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink/55">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-moss" />
            Net profit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-clay/50" />
            Transport + handling
          </span>
        </div>
      </div>

      <div
        className="mt-6 h-[19rem] w-full"
        role="img"
        aria-label="Net profit by market"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 5, left: 0, bottom: 8 }}
            barGap={2}
          >
            <CartesianGrid
              vertical={false}
              stroke="#315c45"
              strokeOpacity={0.1}
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#17251f", fontSize: 11, fontWeight: 700 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#17251f", opacity: 0.5, fontSize: 10 }}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              width={42}
            />
            <ReferenceLine y={0} stroke="#17251f" strokeOpacity={0.22} />
            <Tooltip
              cursor={{ fill: "rgba(49,92,69,0.05)" }}
              contentStyle={{
                border: "1px solid rgba(23,37,31,0.12)",
                borderRadius: "14px",
                background: "#fffdf7",
                boxShadow: "0 12px 30px rgba(23,37,31,0.14)",
                fontSize: "12px",
              }}
              formatter={(value, name, item) => {
                const formatted = `LKR ${formatLkr(Number(value))}`;
                if (name === "netProfit") {
                  const spoilage = item?.payload?.spoilageLoss;
                  return [
                    typeof spoilage === "number"
                      ? `${formatted} (spoilage deduction: LKR ${formatLkr(spoilage)})`
                      : formatted,
                    "Net profit",
                  ];
                }
                return [formatted, "Transport + handling"];
              }}
            />
            <Bar dataKey="netProfit" radius={[6, 6, 0, 0]} maxBarSize={38}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.marketCode}
                  fill={
                    entry.netProfit < 0
                      ? "#8b3e2b"
                      : entry.recommended
                        ? "#315c45"
                        : "#9db69e"
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="cashDeductions"
              fill="#c7643b"
              fillOpacity={0.42}
              radius={[6, 6, 0, 0]}
              maxBarSize={26}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/10 pt-4 sm:grid-cols-4 lg:grid-cols-7">
        {sortedMarkets.map((market) => (
          <div key={market.marketCode} className="min-w-0">
            <p className="truncate font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink/45">
              {shortMarketName(market.marketName)}
            </p>
            <p className="mt-1 font-display text-base font-semibold text-ink">
              LKR {formatLkr(market.netProfitLkr)}
            </p>
            <p className="text-[0.68rem] text-ink/45">
              {formatUpliftLabel(market)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

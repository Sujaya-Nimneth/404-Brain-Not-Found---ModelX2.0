import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketComparison } from "../types/atie";

interface Props {
  markets: MarketComparison[];
}

export function ProfitMarginChart({ markets }: Props) {
  const chartData = [...markets]
    .sort((a, b) => b.netProfitLkr - a.netProfitLkr)
    .map((market) => ({
      name: shortMarketName(market.marketName),
      netProfit: Math.round(market.netProfitLkr),
      transport: Math.round(market.transportCostLkr + market.spoilageLossLkr),
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
        </div>
        <div className="flex items-center gap-4 text-xs text-ink/55">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-moss" />
            Net profit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-clay/50" />
            Transport + spoilage
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
            <Tooltip
              cursor={{ fill: "rgba(49,92,69,0.05)" }}
              contentStyle={{
                border: "1px solid rgba(23,37,31,0.12)",
                borderRadius: "14px",
                background: "#fffdf7",
                boxShadow: "0 12px 30px rgba(23,37,31,0.14)",
                fontSize: "12px",
              }}
              formatter={(value, name) => [
                `LKR ${new Intl.NumberFormat("en-LK").format(Number(value))}`,
                name === "netProfit" ? "Net profit" : "Transport + spoilage",
              ]}
            />
            <Bar dataKey="netProfit" radius={[6, 6, 0, 0]} maxBarSize={34}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.marketCode}
                  fill={entry.recommended ? "#315c45" : "#9db69e"}
                />
              ))}
            </Bar>
            <Bar
              dataKey="transport"
              fill="#c7643b"
              fillOpacity={0.42}
              radius={[6, 6, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/10 pt-4 sm:grid-cols-4">
        {markets.map((market) => (
          <div key={market.marketCode} className="min-w-0">
            <p className="truncate font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink/45">
              {shortMarketName(market.marketName)}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink">
              {Math.round(market.netProfitLkr / 1000)}k
            </p>
            <p className="text-[0.68rem] text-ink/45">
              {market.profitUpliftPct === null
                ? "baseline"
                : `+${market.profitUpliftPct.toFixed(1)}%`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function shortMarketName(name: string) {
  if (name.includes("Pettah")) return "Pettah";
  return name.split(" ")[0];
}

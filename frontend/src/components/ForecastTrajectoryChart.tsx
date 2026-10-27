import { useEffect, useMemo, useState } from "react";
import { AlertCircle, LineChart as LineChartIcon, LoaderCircle } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchMarketHistory } from "../api/atieClient";
import type {
  ForecastSource,
  MarketHistoryResponse,
} from "../types/atie";

interface Props {
  marketCode: string;
  marketName: string;
  cropCode: string;
  forecastSource: ForecastSource;
}

type ChartPoint = {
  label: string;
  actual: number | null;
  model: number | null;
  naive: number | null;
  ma7: number | null;
};

export function ForecastTrajectoryChart({
  marketCode,
  marketName,
  cropCode,
  forecastSource,
}: Props) {
  const [history, setHistory] = useState<MarketHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchMarketHistory(marketCode, cropCode)
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setHistory(null);
        setError(
          reason instanceof Error
            ? reason.message
            : "The forecast trajectory is unavailable.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [marketCode, cropCode]);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!history) return [];
    const points: ChartPoint[] = history.history.map((point) => ({
      label: formatDate(point.date),
      actual: point.priceLkrPerKg,
      model: null,
      naive: null,
      ma7: null,
    }));
    const last = points.at(-1);
    if (!last) return [];
    history.forecastTrajectory.forEach((forecast) => {
      points.push({
        label: `+${forecast.horizonHours}h`,
        actual: null,
        model: forecast.predictedPriceLkr,
        naive: forecast.baselineNaiveLkr,
        ma7: forecast.baselineMa7Lkr,
      });
    });
    const bridge = history.forecastTrajectory[0];
    if (bridge) {
      last.model = last.actual;
      last.naive = last.actual;
      last.ma7 = last.actual;
    }
    return points;
  }, [history]);

  const source = history?.forecastSource ?? forecastSource;
  const finalPoint = history?.forecastTrajectory.at(-1);

  return (
    <section className="rise-in rounded-[2rem] border border-ink/10 bg-[#f8f2e5]/90 p-5 shadow-card md:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Forecast trace
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            History meets the horizon.
          </h2>
          <p className="mt-2 max-w-xl text-xs leading-6 text-ink/55">
            Fourteen days at {marketName} compared with the trained model,
            naive persistence, and the 7-day moving average.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-ink/10 bg-white/55 px-3 py-1.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-ink/50">
            {source.replaceAll("_", " ")}
          </span>
          {finalPoint && (
            <span
              className={`rounded-full px-3 py-1.5 font-mono text-[0.58rem] font-bold uppercase tracking-[0.1em] ${
                finalPoint.direction === "CRASH"
                  ? "bg-[#f5d1c2] text-[#8b3e2b]"
                  : finalPoint.direction === "SURGE"
                    ? "bg-[#d8e8bd] text-moss"
                    : "bg-[#ebe5d8] text-ink/55"
              }`}
            >
              {finalPoint.direction} at +72h
            </span>
          )}
        </div>
      </div>

      <div
        className="relative mt-6 h-[20rem] w-full"
        role="img"
        aria-label={`Historical and forecast prices for ${marketName}`}
      >
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[#f8f2e5]/75 backdrop-blur-sm">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink/55">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading the forecast trace…
            </span>
          </div>
        )}
        {!loading && error && (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-clay/30 bg-white/35 px-6 text-center">
            <div>
              <AlertCircle className="mx-auto h-6 w-6 text-clay" />
              <p className="mt-3 text-sm font-semibold text-ink">
                Trajectory unavailable
              </p>
              <p className="mt-1 max-w-md text-xs leading-5 text-ink/50">
                {error}
              </p>
            </div>
          </div>
        )}
        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#315c45"
                strokeOpacity={0.1}
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={18}
                tick={{ fill: "#17251f", fontSize: 10, fontWeight: 600 }}
                dy={8}
              />
              <YAxis
                domain={["auto", "auto"]}
                axisLine={false}
                tickLine={false}
                width={44}
                tick={{ fill: "#17251f", opacity: 0.5, fontSize: 10 }}
                tickFormatter={(value) => `LKR ${Math.round(value)}`}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid rgba(23,37,31,0.12)",
                  borderRadius: "14px",
                  background: "#fffdf7",
                  boxShadow: "0 12px 30px rgba(23,37,31,0.14)",
                  fontSize: "12px",
                }}
                formatter={(value, name) => [
                  `LKR ${Number(value).toFixed(2)}/kg`,
                  lineLabel(String(name)),
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={42}
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, color: "#17251f" }}
                formatter={(value) => lineLabel(String(value))}
              />
              {history?.referenceDate && (
                <ReferenceLine
                  x={formatDate(history.referenceDate)}
                  stroke="#315c45"
                  strokeOpacity={0.32}
                  strokeDasharray="4 4"
                />
              )}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#17251f"
                strokeWidth={2.4}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="model"
                stroke="#315c45"
                strokeWidth={2.8}
                strokeDasharray="7 4"
                dot={{ r: 4, fill: "#315c45", strokeWidth: 0 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="naive"
                stroke="#c7643b"
                strokeWidth={1.6}
                strokeDasharray="3 5"
                dot={{ r: 3, fill: "#c7643b", strokeWidth: 0 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="ma7"
                stroke="#9b7a2f"
                strokeWidth={1.6}
                strokeDasharray="2 4"
                dot={{ r: 3, fill: "#9b7a2f", strokeWidth: 0 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-ink/10 pt-4 font-mono text-[0.58rem] uppercase tracking-[0.11em] text-ink/40">
        <LineChartIcon className="h-3.5 w-3.5" />
        {history
          ? `${history.history.length} observed days · ${history.forecastTrajectory.length} forecast horizons`
          : "Awaiting API history"}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function lineLabel(key: string) {
  const labels: Record<string, string> = {
    actual: "Observed price",
    model: "Model forecast",
    naive: "Naive",
    ma7: "7-day MA",
  };
  return labels[key] ?? key;
}

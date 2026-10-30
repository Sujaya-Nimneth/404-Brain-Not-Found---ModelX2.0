import {
  ArrowUpRight,
  BadgeCheck,
  TriangleAlert,
  TrendingDown,
} from "lucide-react";
import type { AnalyzeResponse } from "../types/atie";
import { formatLkr } from "../utils/format";

interface Props {
  response: AnalyzeResponse;
}

export function PrimaryDirectiveCard({ response }: Props) {
  const directive = response.primaryDirective;
  const recommended = response.marketComparisons.find(
    (market) => market.marketCode === directive.recommendedMarketCode,
  );
  const defaultMarket = response.marketComparisons.find(
    (market) => market.marketCode === directive.defaultMarketCode,
  );
  const isReroute = directive.severity === "CRITICAL_REROUTE";
  const isHold = directive.severity === "HOLD_HARVEST";

  return (
    <section
      className={`rise-in rise-in-delay-1 relative overflow-hidden rounded-[2rem] p-6 shadow-card md:p-8 ${
        isHold
          ? "bg-[#4c2720] text-cream"
          : isReroute
            ? "bg-ink text-cream"
            : "bg-moss text-cream"
      }`}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[42px] border-lime/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 right-1/3 h-56 w-56 rounded-full bg-clay/15 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] ${
                isHold
                  ? "bg-[#e8a98d] text-[#3b1b14]"
                  : isReroute
                    ? "bg-lime text-ink"
                    : "bg-white/15 text-cream"
              }`}
            >
              {isReroute ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <BadgeCheck className="h-3.5 w-3.5" />
              )}
              {directive.severity.replaceAll("_", " ")}
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-cream/65">
              {response.forecastSource.replaceAll("_", " ")}
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-cream/65">
              Inputs {response.inputDataState}
            </span>
          </div>

          <h2 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.03] md:text-6xl">
            {directive.headline}
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-cream/72 md:text-base">
            {directive.explanation}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 lg:w-[22rem]">
          <Metric
            label="Default forecast"
            value={
              defaultMarket
                ? `${defaultMarket.predictedPriceLkr.toFixed(2)}`
                : "—"
            }
            suffix="LKR/kg"
            tone={defaultMarket?.direction === "CRASH" ? "danger" : "neutral"}
          />
          <Metric
            label="Recommended"
            value={
              recommended
                ? `${recommended.predictedPriceLkr.toFixed(2)}`
                : "—"
            }
            suffix="LKR/kg"
            tone={recommended?.direction === "SURGE" ? "good" : "neutral"}
          />
          <Metric
            label="Profit uplift"
            value={
              directive.profitUpliftPct === null
                ? "n/a"
                : `+${directive.profitUpliftPct.toFixed(2)}%`
            }
            suffix="net"
            tone="good"
          />
          <Metric
            label="Extra take-home"
            value={
              directive.profitDeltaLkr === null
                ? "—"
                : formatLkr(directive.profitDeltaLkr)
            }
            suffix="LKR"
            tone="good"
          />
        </div>
      </div>

      {defaultMarket?.direction === "CRASH" && (
        <div className="relative z-10 mt-7 flex items-start gap-3 rounded-2xl border border-[#e9b29c]/20 bg-[#8b3e2b]/30 p-4 text-sm text-[#f6c6b2]">
          <TrendingDown className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {defaultMarket.marketName} prices are forecast to fall{" "}
            <strong className="text-cream">
              {Math.abs(
                ((defaultMarket.predictedPriceLkr -
                  defaultMarket.currentPriceLkr) /
                  defaultMarket.currentPriceLkr) *
                  100,
              ).toFixed(1)}
              %
            </strong>{" "}
            within the selected forecast window.
            Do not commit the consignment to the default market without reviewing
            this route.
          </p>
        </div>
      )}

      {isHold && (
        <div className="relative z-10 mt-7 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#f4b48d]" />
          <p>
            Every reachable market produces a weak net outcome. Hold the harvest
            and review local demand before dispatching transport.
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  tone: "good" | "danger" | "neutral";
}) {
  return (
    <div className="bg-ink/85 p-4">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-cream/45">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-2xl font-semibold ${
          tone === "good"
            ? "text-lime"
            : tone === "danger"
              ? "text-[#f3aa8e]"
              : "text-cream"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[0.68rem] text-cream/40">{suffix}</p>
    </div>
  );
}

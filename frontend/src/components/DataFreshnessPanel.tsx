import { Database, Radio, ShieldAlert } from "lucide-react";
import type { DataStatus } from "../types/atie";

interface Props {
  status: DataStatus | null;
  unavailable: boolean;
}

export function DataFreshnessPanel({ status, unavailable }: Props) {
  const livePrices = status?.priceCoverage.filter(
    (item) => item.state === "CURRENT",
  ).length;
  const seedPrices = status?.priceCoverage.filter(
    (item) => item.state === "SEED",
  ).length;

  return (
    <section
      aria-label="Live data status"
      className="rise-in rounded-[2rem] border border-ink/10 bg-cream/90 p-5 shadow-card md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Data provenance
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Live where it can be.
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-ink/55">
            Every source is labeled honestly. A successful refresh does not
            make an old monthly price current, and unavailable CROPIX data is
            never backfilled as live.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.12em] ${
            status?.overallStatus === "LIVE"
              ? "bg-[#cfe4c1] text-moss"
              : status?.overallStatus === "PARTIAL"
                ? "bg-[#f3e3b8] text-[#765719]"
                : "bg-[#f5d1c2] text-[#8b3e2b]"
          }`}
        >
          {unavailable
            ? "STATUS UNAVAILABLE"
            : (status?.overallStatus ?? "LOADING")}
        </span>
      </div>

      {unavailable && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-clay/25 bg-[#f5ded4] p-4 text-xs leading-6 text-[#6f2f1d]"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          The provenance endpoint is unavailable. Forecast source badges still
          distinguish model, fallback, and canonical fixture output.
        </div>
      )}

      {!unavailable && (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(status?.sources ?? []).map((source) => (
            <article
              key={source.sourceCode}
              className="rounded-2xl border border-ink/10 bg-white/45 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink/5 text-moss">
                  {source.dataState === "LIVE" ? (
                    <Radio className="h-3.5 w-3.5" />
                  ) : (
                    <Database className="h-3.5 w-3.5" />
                  )}
                </span>
                <span
                  className={`rounded-full px-2 py-1 font-mono text-[0.52rem] font-bold uppercase tracking-[0.1em] ${
                    source.dataState === "LIVE" &&
                    source.freshness === "CURRENT"
                      ? "bg-[#d8e8bd] text-moss"
                      : source.dataState === "UNAVAILABLE"
                        ? "bg-[#f5d1c2] text-[#8b3e2b]"
                        : "bg-[#f3e3b8] text-[#765719]"
                  }`}
                >
                  {source.dataState} / {source.freshness}
                </span>
              </div>
              <p className="mt-3 font-bold text-ink">{source.label}</p>
              <p className="mt-1 text-[0.68rem] leading-5 text-ink/50">
                {source.latestObservationDate
                  ? `Latest observation ${formatDate(source.latestObservationDate)} · ${source.recordsWritten.toLocaleString("en-LK")} rows`
                  : source.message ?? "No observation has been ingested."}
              </p>
            </article>
          ))}
        </div>
      )}

      {!unavailable && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/10 pt-4 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-ink/40">
          <span>
            {livePrices ?? 0}/{status?.priceCoverage.length ?? 0} current
            market/crop series
          </span>
          <span>{seedPrices ?? 0} seed-backed series</span>
          <span>Forecast values remain labeled separately</span>
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

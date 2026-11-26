import { Database, LoaderCircle, Radio, ShieldAlert } from "lucide-react";
import type { DataStatus } from "../types/atie";

interface Props {
  status: DataStatus | null;
  unavailable: boolean;
  loading?: boolean;
}

export function DataFreshnessPanel({
  status,
  unavailable,
  loading = false,
}: Props) {
  const coverage = status?.priceCoverage ?? [];
  const countByState = (
    state: DataStatus["priceCoverage"][number]["state"],
  ) => coverage.filter((item) => item.state === state).length;

  const livePrices = countByState("CURRENT");
  const cachedPrices = countByState("CACHED");
  const stalePrices = countByState("STALE");
  const seedPrices = countByState("SEED");
  const unavailablePrices =
    countByState("UNAVAILABLE") + countByState("UNKNOWN");

  return (
    <section
      aria-label="Live data status"
      className="rise-in rounded-[2rem] border border-ink/10 bg-cream/90 p-5 shadow-card md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Data provenance
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Live where it can be.
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-ink/70">
            Every source is labeled honestly. A successful refresh does not
            make an old monthly price current, and unavailable CROPIX data is
            never backfilled as live.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/75 px-3 py-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink/70"
            >
              <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              Refreshing
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1.5 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.12em] ${
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
      </div>

      {unavailable && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-clay/25 bg-[#f5ded4] p-4 text-xs leading-6 text-[#6f2f1d]"
        >
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          The provenance endpoint is unavailable. Forecast source badges still
          distinguish model, fallback, and canonical fixture output.
        </div>
      )}

      {!unavailable && (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(status?.sources ?? []).map((source) => (
            <article
              key={source.sourceCode}
              className="rounded-2xl border border-ink/10 bg-white/55 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 place-items-center rounded-full bg-ink/5 text-moss"
                >
                  {source.dataState === "LIVE" ? (
                    <Radio className="h-3.5 w-3.5" />
                  ) : (
                    <Database className="h-3.5 w-3.5" />
                  )}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] ${
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
              <p className="mt-1 text-xs leading-5 text-ink/70">
                {source.latestObservationDate
                  ? `Latest observation ${formatDate(source.latestObservationDate)} · ${source.recordsWritten.toLocaleString("en-LK")} rows`
                  : source.message ?? "No observation has been ingested."}
              </p>
              {source.latestObservationDate && source.message && (
                <p className="mt-1 text-[0.6875rem] leading-5 text-ink/60">
                  {source.message}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {!unavailable && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/10 pt-4 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink/65">
          <span>
            {livePrices}/{coverage.length} current series
          </span>
          {cachedPrices > 0 && <span>{cachedPrices} cached series</span>}
          {stalePrices > 0 && <span>{stalePrices} stale series</span>}
          <span>{seedPrices} seed-backed series</span>
          {unavailablePrices > 0 && (
            <span>{unavailablePrices} unavailable series</span>
          )}
          <span>Forecast values remain labeled separately</span>
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

import { memo, useMemo, useState } from "react";
import { CloudRain, Droplets, Wind } from "lucide-react";
import type { WeatherAlert } from "../types/atie";

interface Props {
  alerts: WeatherAlert[];
  marketNames?: Record<string, string>;
}

const DEFAULT_MARKET_NAMES: Record<string, string> = {
  DAMBULLA: "Dambulla Dedicated Economic Centre",
  PETTAH_COLOMBO: "Colombo Pettah Wholesale Market",
  KEPPETIPOLA: "Keppetipola Dedicated Economic Centre",
  MEEGODA: "Meegoda Dedicated Economic Centre",
  NUWARA_ELIYA: "Nuwara Eliya Dedicated Economic Centre",
  THAMBUTTEGAMA: "Thambuttegama Dedicated Economic Centre",
  JAFFNA: "Jaffna Wholesale Market",
};

export const WeatherDisruptionCard = memo(function WeatherDisruptionCard({
  alerts,
  marketNames,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const orderedAlerts = useMemo(
    () =>
      [...alerts].sort(
        (left, right) => riskRank(right.riskLevel) - riskRank(left.riskLevel),
      ),
    [alerts],
  );
  const visibleAlerts = expanded ? orderedAlerts : orderedAlerts.slice(0, 3);

  return (
    <section
      aria-label="Weather and supply disruptions"
      className="rise-in rise-in-delay-3 rounded-[2rem] bg-[#dce8c7] p-5 shadow-card md:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Weather & supply
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink">
            The road is part of the forecast.
          </h2>
        </div>
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-lime"
        >
          <CloudRain className="h-5 w-5" />
        </span>
      </div>

      {alerts.length === 0 ? (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-ink/15 bg-cream/75 p-5 text-center text-xs leading-6 text-ink/75"
        >
          No active route weather disruptions reported across monitored corridors.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visibleAlerts.map((alert) => {
            const label =
              marketNames?.[alert.marketCode] ??
              DEFAULT_MARKET_NAMES[alert.marketCode] ??
              alert.marketCode.replaceAll("_", " ");
            return (
              <article
                key={alert.marketCode}
                className="rounded-2xl border border-ink/10 bg-cream/85 p-4 backdrop-blur"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">{label}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.1em] ${
                      alert.riskLevel === "HIGH"
                        ? "bg-[#f5d1c2] text-[#752f1e]"
                        : alert.riskLevel === "MEDIUM"
                          ? "bg-[#f3e3b8] text-[#664911]"
                          : "bg-[#cfe4c1] text-[#284b38]"
                    }`}
                  >
                    {alert.riskLevel} risk
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-ink/80">
                  {alert.message}
                </p>
                <div className="mt-3 flex items-center gap-4 text-[0.6875rem] font-semibold text-ink/70">
                  <span className="inline-flex items-center gap-1.5">
                    <Droplets aria-hidden="true" className="h-3.5 w-3.5" />
                    {alert.precipitationMm.toFixed(1)} mm
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Wind aria-hidden="true" className="h-3.5 w-3.5" />
                    {alert.extremeWeather ? "Extreme flag" : "Normal route"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink/65">
                  {alert.source.replaceAll("_", " ")} ·{" "}
                  {formatDate(alert.observationDate)}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {alerts.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-4 w-full rounded-full border border-ink/20 bg-cream/75 px-4 py-2.5 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-ink/80 transition hover:border-moss hover:text-moss"
        >
          {expanded
            ? "Show highest-risk markets"
            : `Show all ${alerts.length} market alerts`}
        </button>
      )}
    </section>
  );
});

function riskRank(level: WeatherAlert["riskLevel"]) {
  return level === "HIGH" ? 3 : level === "MEDIUM" ? 2 : 1;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

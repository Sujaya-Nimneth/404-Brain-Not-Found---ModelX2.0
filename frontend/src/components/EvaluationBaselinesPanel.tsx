import { memo } from "react";
import { ChartNoAxesCombined, ShieldAlert } from "lucide-react";
import type { ModelEvaluationSummary, SafeMarginFpr } from "../types/atie";
import { formatFixed2 } from "../utils/format";

interface Props {
  summary: ModelEvaluationSummary;
  horizonHours?: 48 | 72;
}

export const EvaluationBaselinesPanel = memo(function EvaluationBaselinesPanel({
  summary,
  horizonHours,
}: Props) {
  return (
    <section
      aria-label="Evaluation baselines"
      className="rise-in rounded-[2rem] border border-ink/10 bg-cream/90 p-5 shadow-card md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Evaluation baselines
            {horizonHours ? ` · ${horizonHours}h horizon` : ""}
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Accuracy is not the only safety test.
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-ink/70">
            Directional symmetry and price error are compared with naive
            persistence and the seven-day moving average. Safe-margin false
            positives measure whether a reroute would actually have paid.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="grid h-11 w-11 place-items-center rounded-full bg-ink text-lime"
        >
          <ChartNoAxesCombined className="h-5 w-5" />
        </span>
      </div>

      {!summary.available ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-amber/30 bg-[#f4e6bd]/80 p-4 text-xs leading-6 text-[#5f440e]"
        >
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {summary.message ?? "Evaluation metrics are unavailable."}
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/15 font-mono text-[0.6875rem] uppercase tracking-[0.11em] text-ink/70">
                <th scope="col" className="px-2 py-3 font-medium">
                  Forecast
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Directional symmetry
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  MAE
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Safe-margin FPR
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Reroute sample
                </th>
              </tr>
            </thead>
            <tbody>
              <EvaluationRow
                label="Trained model"
                highlight
                directionalSymmetryPct={summary.modelDirectionalSymmetryPct}
                maeLkr={summary.modelMaeLkr}
                fpr={summary.modelSafeMarginFpr}
              />
              <EvaluationRow
                label="Naive persistence"
                directionalSymmetryPct={summary.naiveDirectionalSymmetryPct}
                maeLkr={summary.naiveMaeLkr}
                fpr={summary.naiveSafeMarginFpr}
              />
              <EvaluationRow
                label="7-day moving average"
                directionalSymmetryPct={summary.ma7DirectionalSymmetryPct}
                maeLkr={summary.ma7MaeLkr}
                fpr={summary.ma7SafeMarginFpr}
              />
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

function EvaluationRow({
  label,
  directionalSymmetryPct,
  maeLkr,
  fpr,
  highlight = false,
}: {
  label: string;
  directionalSymmetryPct: number | null;
  maeLkr: number | null;
  fpr: SafeMarginFpr | null;
  highlight?: boolean;
}) {
  return (
    <tr
      className={`border-b border-ink/10 text-sm ${
        highlight ? "bg-lime/20" : ""
      }`}
    >
      <td className="px-2 py-4 font-bold text-ink">{label}</td>
      <td className="px-2 py-4 font-mono text-xs text-ink/80">
        {directionalSymmetryPct === null
          ? "n/a"
          : `${formatFixed2(directionalSymmetryPct)}%`}
      </td>
      <td className="px-2 py-4 font-mono text-xs text-ink/80">
        {maeLkr === null ? "n/a" : `LKR ${formatFixed2(maeLkr)}`}
      </td>
      <td className="px-2 py-4 font-mono text-xs text-ink/80">
        {fpr?.safeMarginFprPct == null
          ? "n/a"
          : `${formatFixed2(fpr.safeMarginFprPct)}%`}
      </td>
      <td className="px-2 py-4 font-mono text-xs text-ink/70">
        {fpr
          ? `${fpr.falseRerouteCount.toLocaleString("en-LK")} false / ${fpr.rerouteCount.toLocaleString("en-LK")} reroutes`
          : "n/a"}
      </td>
    </tr>
  );
}

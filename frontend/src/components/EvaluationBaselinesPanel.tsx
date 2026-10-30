import { ChartNoAxesCombined, ShieldAlert } from "lucide-react";
import type { ModelEvaluationSummary, SafeMarginFpr } from "../types/atie";

interface Props {
  summary: ModelEvaluationSummary;
}

export function EvaluationBaselinesPanel({ summary }: Props) {
  return (
    <section className="rise-in rounded-[2rem] border border-ink/10 bg-cream/90 p-5 shadow-card md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-moss">
            Evaluation baselines
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
            Accuracy is not the only safety test.
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-ink/55">
            Directional symmetry and price error are compared with naive
            persistence and the seven-day moving average. Safe-margin false
            positives measure whether a reroute would actually have paid.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-lime">
          <ChartNoAxesCombined className="h-5 w-5" />
        </span>
      </div>

      {!summary.available ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-amber/30 bg-[#f4e6bd]/75 p-4 text-xs leading-6 text-[#6b4f16]"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {summary.message ?? "Evaluation metrics are unavailable."}
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/15 font-mono text-[0.58rem] uppercase tracking-[0.13em] text-ink/45">
                <th className="px-2 py-3 font-medium">Forecast</th>
                <th className="px-2 py-3 font-medium">Directional symmetry</th>
                <th className="px-2 py-3 font-medium">MAE</th>
                <th className="px-2 py-3 font-medium">Safe-margin FPR</th>
                <th className="px-2 py-3 font-medium">Reroute sample</th>
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
}

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
      className={`border-b border-ink/8 text-sm ${
        highlight ? "bg-lime/20" : ""
      }`}
    >
      <td className="px-2 py-4 font-bold text-ink">{label}</td>
      <td className="px-2 py-4 font-mono text-xs text-ink/65">
        {directionalSymmetryPct === null
          ? "n/a"
          : `${directionalSymmetryPct.toFixed(2)}%`}
      </td>
      <td className="px-2 py-4 font-mono text-xs text-ink/65">
        {maeLkr === null ? "n/a" : `LKR ${maeLkr.toFixed(2)}`}
      </td>
      <td className="px-2 py-4 font-mono text-xs text-ink/65">
        {fpr?.safeMarginFprPct == null
          ? "n/a"
          : `${fpr.safeMarginFprPct.toFixed(2)}%`}
      </td>
      <td className="px-2 py-4 font-mono text-[0.68rem] text-ink/50">
        {fpr
          ? `${fpr.falseRerouteCount.toLocaleString("en-LK")} false / ${fpr.rerouteCount.toLocaleString("en-LK")} reroutes`
          : "n/a"}
      </td>
    </tr>
  );
}

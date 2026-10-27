import { Activity, BadgeCheck } from "lucide-react";
import type { ModelEvaluationSummary } from "../types/atie";

export function ModelEvaluationBadge({
  summary,
}: {
  summary: ModelEvaluationSummary;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-cream/70 px-3 py-2.5 text-[0.66rem] text-ink/60 shadow-sm backdrop-blur">
      <span className="inline-flex items-center gap-1.5 font-mono font-semibold uppercase tracking-[0.1em] text-moss">
        <Activity className="h-3.5 w-3.5" />
        Model check
      </span>
      <span className="hidden h-4 w-px bg-ink/15 sm:block" />
      <span>
        DS{" "}
        <strong className="text-ink">
          {summary.modelDirectionalSymmetryPct.toFixed(1)}%
        </strong>
      </span>
      <span>
        MAE{" "}
        <strong className="text-ink">
          {summary.modelMaeLkr.toFixed(2)}
        </strong>
      </span>
      <span className="inline-flex items-center gap-1 text-moss">
        <BadgeCheck className="h-3.5 w-3.5" />
        vs naive + MA7
      </span>
    </div>
  );
}

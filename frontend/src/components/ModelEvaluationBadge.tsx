import { Activity, BadgeCheck } from "lucide-react";
import type { ModelEvaluationSummary } from "../types/atie";
import { formatFixed2 } from "../utils/format";

export function ModelEvaluationBadge({
  summary,
}: {
  summary: ModelEvaluationSummary;
}) {
  if (!summary.available) {
    return (
      <div
        className="flex items-center gap-2 rounded-2xl border border-amber/30 bg-[#f4e6bd]/80 px-3 py-2.5 text-[0.6875rem] text-[#5f440e]"
        title={summary.message ?? undefined}
      >
        <Activity aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="font-mono font-semibold uppercase tracking-[0.1em]">
          Evaluation unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/15 bg-cream/85 px-3 py-2.5 text-[0.6875rem] text-ink/75 shadow-sm backdrop-blur">
      <span className="inline-flex items-center gap-1.5 font-mono font-semibold uppercase tracking-[0.1em] text-moss">
        <Activity aria-hidden="true" className="h-3.5 w-3.5" />
        Model check
      </span>
      <span aria-hidden="true" className="hidden h-4 w-px bg-ink/15 sm:block" />
      <span>
        DS{" "}
        <strong className="text-ink">
          {summary.modelDirectionalSymmetryPct == null
            ? "n/a"
            : `${formatFixed2(summary.modelDirectionalSymmetryPct)}%`}
        </strong>
      </span>
      <span>
        MAE{" "}
        <strong className="text-ink">
          {summary.modelMaeLkr == null
            ? "n/a"
            : `${formatFixed2(summary.modelMaeLkr)} LKR`}
        </strong>
      </span>
      <span>
        SM-FPR{" "}
        <strong className="text-ink">
          {summary.modelSafeMarginFpr?.safeMarginFprPct == null
            ? "n/a"
            : `${formatFixed2(summary.modelSafeMarginFpr.safeMarginFprPct)}%`}
        </strong>
      </span>
      <span className="inline-flex items-center gap-1 text-moss">
        <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
        vs naive + MA7
      </span>
    </div>
  );
}

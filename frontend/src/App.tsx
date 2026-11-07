import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, Leaf, Map, RefreshCw, TriangleAlert, X } from "lucide-react";
import {
  analyzeConsignment,
  AtieApiError,
  fetchDataStatus,
} from "./api/atieClient";
import { DataFreshnessPanel } from "./components/DataFreshnessPanel";
import { EvaluationBaselinesPanel } from "./components/EvaluationBaselinesPanel";
import { ModelEvaluationBadge } from "./components/ModelEvaluationBadge";
import { OnboardingConfigModal } from "./components/OnboardingConfigModal";
import { PrimaryDirectiveCard } from "./components/PrimaryDirectiveCard";
import { RoutingLogisticsPanel } from "./components/RoutingLogisticsPanel";
import { WeatherDisruptionCard } from "./components/WeatherDisruptionCard";
import { demoRequest, demoResponse } from "./data/demoResponse";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  DataStatus,
} from "./types/atie";

const ProfitMarginChart = lazy(() =>
  import("./components/ProfitMarginChart").then((module) => ({
    default: module.ProfitMarginChart,
  })),
);
const ForecastTrajectoryChart = lazy(() =>
  import("./components/ForecastTrajectoryChart").then((module) => ({
    default: module.ForecastTrajectoryChart,
  })),
);

const defaultRequest: AnalyzeRequest = {
  ...demoRequest,
  demoMode: false,
};

interface ResultSnapshot {
  request: AnalyzeRequest;
  response: AnalyzeResponse;
}

interface AnalysisFailure {
  message: string;
  keptPreviousResult: boolean;
}

export default function App() {
  const [request, setRequest] = useState<AnalyzeRequest>(defaultRequest);
  const [result, setResult] = useState<ResultSnapshot | null>({
    request: demoRequest,
    response: {
      ...demoResponse,
      analysisState: {
        kind: "demo",
        message:
          "Showing the verified competition fixture. Select a scenario and analyze it for live model output.",
      },
    },
  });
  const [loading, setLoading] = useState(false);
  const [analysisFailure, setAnalysisFailure] =
    useState<AnalysisFailure | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [dataStatusUnavailable, setDataStatusUnavailable] = useState(false);
  const activeControllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const resultRef = useRef<ResultSnapshot | null>(result);
  resultRef.current = result;
  const response = result?.response ?? null;
  const activeRequest = result?.request ?? request;

  const refreshDataStatus = useCallback((signal?: AbortSignal) => {
    fetchDataStatus(signal)
      .then((status) => {
        if (!signal?.aborted) {
          setDataStatus(status);
          setDataStatusUnavailable(false);
        }
      })
      .catch(() => {
        if (!signal?.aborted) {
          setDataStatusUnavailable(true);
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshDataStatus(controller.signal);
    return () => {
      controller.abort();
      activeControllerRef.current?.abort();
    };
  }, [refreshDataStatus]);

  async function run(nextRequest: AnalyzeRequest) {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const currentRunId = ++runIdRef.current;

    setRequest(nextRequest);
    setLoading(true);
    setAnalysisFailure(null);
    try {
      const apiResponse = await analyzeConsignment(
        nextRequest,
        controller.signal,
      );
      if (currentRunId !== runIdRef.current || controller.signal.aborted) {
        return;
      }
      setResult({
        request: nextRequest,
        response: {
          ...apiResponse,
          analysisState:
            apiResponse.forecastSource === "DEMO_FIXTURE"
              ? {
                  kind: "demo",
                  message:
                    "The canonical competition fixture was requested explicitly; these values are not live model output.",
                }
              : { kind: "live" },
        },
      });
    } catch (error) {
      if (
        currentRunId !== runIdRef.current ||
        controller.signal.aborted ||
        isAbortError(error)
      ) {
        return;
      }
      const latestResult = resultRef.current;
      const keepPrevious =
        latestResult !== null && sameRequest(latestResult.request, nextRequest);
      if (!keepPrevious) {
        setResult(null);
      }
      setAnalysisFailure({
        message: errorMessage(error),
        keptPreviousResult: keepPrevious,
      });
    } finally {
      if (currentRunId === runIdRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-5 flex flex-col justify-between gap-5 rounded-[2rem] border border-ink/10 bg-cream/65 px-5 py-4 backdrop-blur md:flex-row md:items-center md:px-7">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-lime shadow-lg shadow-ink/15">
            <Leaf className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-ink">
              ATIE
            </p>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.19em] text-ink/45">
              Agricultural Trade & Intelligence Engine
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {response && (
            <ModelEvaluationBadge summary={response.modelEvaluationSummary} />
          )}
          <button
            type="button"
            onClick={() => {
              refreshDataStatus();
              void run({ ...request, demoMode: false });
            }}
            disabled={loading}
            className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 bg-cream text-ink/65 transition hover:border-moss hover:text-moss disabled:opacity-40"
            aria-label="Refresh analysis"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="rise-in">
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-clay">
            Sri Lanka · wholesale intelligence
          </p>
          <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-ink">
            Send the harvest where it{" "}
            <span className="relative inline-block text-moss">
              actually pays.
              <span
                className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-full bg-lime/80"
                aria-hidden
              />
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/60 md:text-base">
            Predictions become decisions here: 48–72 hour prices, route costs,
            spoilage, and a safe net-profit margin before you send a single crate.
          </p>
        </div>
        <div className="hidden items-center gap-2 pb-2 text-right font-mono text-[0.58rem] uppercase tracking-[0.15em] text-ink/35 lg:flex">
          <Map className="h-4 w-4" />
          Dambulla → Pettah
          <br />
          canonical corridor
        </div>
      </section>

      {analysisFailure && (
        <AnalysisFailureNotice
          failure={analysisFailure}
          onDismiss={() => setAnalysisFailure(null)}
        />
      )}

      {response && response.analysisState && shouldShowSourceNotice(response) && (
        <AnalysisNotice
          response={response}
          onDismiss={() =>
            setResult((current) =>
              current
                ? {
                    ...current,
                    response: {
                      ...current.response,
                      analysisState: undefined,
                    },
                  }
                : current,
            )
          }
        />
      )}

      <OnboardingConfigModal
        value={request}
        onChange={setRequest}
        onAnalyze={() => run({ ...request, demoMode: false })}
        onDemo={() => run(demoRequest)}
        loading={loading}
      />

      <div className="mt-5">
        <DataFreshnessPanel
          status={dataStatus}
          unavailable={dataStatusUnavailable}
        />
      </div>

      {response ? (
        <>
          <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.45fr_0.9fr]">
            <PrimaryDirectiveCard response={response} />
            <WeatherDisruptionCard alerts={response.weatherAlerts} />
          </div>

          <div className="mt-5">
            <Suspense
              fallback={<ChartLoading label="Loading market economics…" />}
            >
              <ProfitMarginChart markets={response.marketComparisons} />
            </Suspense>
          </div>

          <div className="mt-5">
            <RoutingLogisticsPanel markets={response.marketComparisons} />
          </div>

          <div className="mt-5">
            <Suspense
              fallback={<ChartLoading label="Loading forecast trace…" />}
            >
              <ForecastTrajectoryChart
                key={`${activeRequest.defaultMarketCode}-${activeRequest.cropCode}-${response.forecastSource}`}
                marketCode={activeRequest.defaultMarketCode}
                marketName={
                  response.marketComparisons.find(
                    (market) =>
                      market.marketCode === activeRequest.defaultMarketCode,
                  )?.marketName ?? activeRequest.defaultMarketCode
                }
                cropCode={activeRequest.cropCode}
                forecastSource={response.forecastSource}
                horizonHours={activeRequest.horizonHours}
                recommendedMarketCode={
                  response.primaryDirective.recommendedMarketCode
                }
                markets={response.marketComparisons}
              />
            </Suspense>
          </div>

          <div className="mt-5">
            <EvaluationBaselinesPanel
              summary={response.modelEvaluationSummary}
            />
          </div>
        </>
      ) : (
        !analysisFailure && (
          <section
            role="status"
            className="mt-5 rounded-[2rem] border border-ink/10 bg-cream/80 p-8 text-center shadow-card"
          >
            <p className="font-display text-2xl font-semibold text-ink">
              No analysis result yet.
            </p>
            <p className="mt-2 text-sm text-ink/55">
              Choose a consignment above and run a safe-route analysis.
            </p>
          </section>
        )
      )}

      <footer className="mt-6 flex flex-col justify-between gap-2 border-t border-ink/10 py-5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink/35 sm:flex-row">
        <span>ATIE · safe routing first</span>
        <span>
          {response
            ? response.forecastSource === "DEMO_FIXTURE"
              ? "Showing verified demo fixture"
              : "Analysis refreshed"
            : "No current result"}
          {response ? ` · ${response.modelVersion}` : ""}
        </span>
      </footer>
    </main>
  );
}

function ChartLoading({ label }: { label: string }) {
  return (
    <section
      role="status"
      className="grid min-h-[20rem] place-items-center rounded-[2rem] border border-ink/10 bg-cream/80 p-6 shadow-card"
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink/55">
        <RefreshCw className="h-4 w-4 animate-spin" />
        {label}
      </span>
    </section>
  );
}

function AnalysisNotice({
  response,
  onDismiss,
}: {
  response: AnalyzeResponse;
  onDismiss: () => void;
}) {
  const demo = response.forecastSource === "DEMO_FIXTURE";
  const fallback = response.forecastSource === "FALLBACK";
  const title = demo
    ? "Demo fixture is active."
    : fallback
      ? "Fallback forecast is active."
      : response.inputDataState === "CACHED"
        ? "Cached inputs are active."
        : "Seed inputs are active.";
  const detail =
    response.analysisState?.kind === "demo"
      ? response.analysisState.message
      : [
          fallback
            ? "The trained model was unavailable, so the deterministic fallback supplied these forecasts."
            : null,
          response.inputDataState === "CACHED"
            ? "Price and weather features include verified local cache data."
            : null,
          response.inputDataState === "SEED"
            ? "Price and weather features include deterministic seed history."
            : null,
        ]
          .filter(Boolean)
          .join(" ");

  return (
    <div
      role="status"
      className="rise-in mb-5 flex items-start gap-3 rounded-2xl border border-amber/30 bg-[#f4e6bd]/75 px-4 py-3 text-xs leading-6 text-[#6b4f16]"
    >
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <strong>{title}</strong> {detail}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss data-source notice"
        className="rounded-full p-1 opacity-55 transition hover:bg-ink/5 hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AnalysisFailureNotice({
  failure,
  onDismiss,
}: {
  failure: AnalysisFailure;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="rise-in mb-5 flex items-start gap-3 rounded-2xl border border-clay/30 bg-[#f3d8cc]/85 px-4 py-3 text-xs leading-6 text-[#6f2f1d]"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <strong>
          {failure.keptPreviousResult
            ? "Analysis failed; the previous matching result remains below."
            : "Analysis failed."}
        </strong>{" "}
        {failure.message}
        {!failure.keptPreviousResult &&
          " No demo fixture was substituted for this request."}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss analysis error"
        className="rounded-full p-1 opacity-55 transition hover:bg-ink/5 hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function shouldShowSourceNotice(response: AnalyzeResponse) {
  return (
    response.forecastSource !== "MODEL" ||
    response.inputDataState !== "LIVE"
  );
}

function errorMessage(error: unknown) {
  if (error instanceof AtieApiError) {
    const code = error.code ? ` (${error.code})` : "";
    const requestId = error.requestId
      ? ` Request ${error.requestId}.`
      : "";
    return `${error.message.replace(/[.!?]+$/, "")}${code}.${requestId}`;
  }
  return error instanceof Error
    ? error.message
    : "The ATIE API is unavailable.";
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function sameRequest(left: AnalyzeRequest, right: AnalyzeRequest) {
  return (
    left.originCode === right.originCode &&
    left.defaultMarketCode === right.defaultMarketCode &&
    left.cropCode === right.cropCode &&
    left.quantityKg === right.quantityKg &&
    left.vehicleType === right.vehicleType &&
    left.horizonHours === right.horizonHours &&
    left.demoMode === right.demoMode
  );
}

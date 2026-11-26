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
  const [dataStatusLoading, setDataStatusLoading] = useState(true);
  const [safeMarginPct, setSafeMarginPct] = useState(5);

  const activeControllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const statusControllerRef = useRef<AbortController | null>(null);
  const statusRunIdRef = useRef(0);
  const resultRef = useRef<ResultSnapshot | null>(result);
  resultRef.current = result;

  const response = result?.response ?? null;
  const activeRequest = result?.request ?? request;
  const hasUnsavedInputs =
    result !== null && !sameInputs(request, result.request);

  const handleThresholdsLoaded = useCallback(
    (thresholds: { safeMarginPct: number }) => {
      if (Number.isFinite(thresholds.safeMarginPct)) {
        setSafeMarginPct(thresholds.safeMarginPct);
      }
    },
    [],
  );

  const refreshDataStatus = useCallback((externalSignal?: AbortSignal) => {
    statusControllerRef.current?.abort();
    const controller = new AbortController();
    statusControllerRef.current = controller;
    const statusRunId = ++statusRunIdRef.current;

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
        return;
      }
      externalSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    setDataStatusLoading(true);
    fetchDataStatus(controller.signal)
      .then((status) => {
        if (
          statusRunId === statusRunIdRef.current &&
          !controller.signal.aborted
        ) {
          setDataStatus(status);
          setDataStatusUnavailable(false);
        }
      })
      .catch(() => {
        if (
          statusRunId === statusRunIdRef.current &&
          !controller.signal.aborted
        ) {
          setDataStatusUnavailable(true);
        }
      })
      .finally(() => {
        if (
          statusRunId === statusRunIdRef.current &&
          !controller.signal.aborted
        ) {
          setDataStatusLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshDataStatus(controller.signal);
    return () => {
      controller.abort();
      statusControllerRef.current?.abort();
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
      const nextAnalysisState =
        apiResponse.analysisState?.kind === "offline_demo"
          ? apiResponse.analysisState
          : apiResponse.forecastSource === "DEMO_FIXTURE"
            ? {
                kind: "demo" as const,
                message:
                  "The canonical competition fixture was requested explicitly; these values are not live model output.",
              }
            : { kind: "live" as const };
      setResult({
        request: nextRequest,
        response: {
          ...apiResponse,
          analysisState: nextAnalysisState,
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
    <div className="mx-auto min-h-screen w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-lime focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="mb-5 flex flex-col justify-between gap-5 rounded-[2rem] border border-ink/10 bg-cream/75 px-5 py-4 backdrop-blur md:flex-row md:items-center md:px-7">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-full bg-ink text-lime shadow-lg shadow-ink/15"
          >
            <Leaf className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-ink">
              ATIE
            </p>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink/70">
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
            className="grid h-10 w-10 place-items-center rounded-full border border-ink/20 bg-cream text-ink/75 transition hover:border-moss hover:text-moss disabled:opacity-40"
            aria-label="Refresh analysis"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="rise-in">
            <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-clay">
              Sri Lanka · wholesale intelligence
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-ink">
              Send the harvest where it{" "}
              <span className="relative inline-block text-moss">
                actually pays.
                <span
                  className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-full bg-lime/80"
                  aria-hidden="true"
                />
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/75 md:text-base">
              Predictions become decisions here: 48–72 hour prices, route costs,
              spoilage, and a safe net-profit margin before you send a single
              crate.
            </p>
          </div>
          <div className="hidden items-center gap-2 pb-2 text-right font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink/65 lg:flex">
            <Map aria-hidden="true" className="h-4 w-4" />
            Dambulla → Pettah
            <br />
            canonical corridor
          </div>
        </section>

        {analysisFailure && (
          <AnalysisFailureNotice
            failure={analysisFailure}
            onRetry={() => void run(request)}
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
          onAnalyze={() => void run({ ...request, demoMode: false })}
          onDemo={() => void run(demoRequest)}
          onThresholdsLoaded={handleThresholdsLoaded}
          loading={loading}
        />

        {hasUnsavedInputs && !loading && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-moss/25 bg-[#e5edd9]/80 px-4 py-3 text-xs text-ink"
          >
            <span>
              <strong>Consignment inputs changed.</strong> Run analysis to refresh
              the routing directive and ledger below.
            </span>
            <button
              type="button"
              onClick={() => void run({ ...request, demoMode: false })}
              className="rounded-full bg-moss px-4 py-1.5 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-cream transition hover:bg-ink"
            >
              Analyze updated route
            </button>
          </div>
        )}

        <div className="mt-5">
          <DataFreshnessPanel
            status={dataStatus}
            unavailable={dataStatusUnavailable}
            loading={dataStatusLoading}
          />
        </div>

        <div aria-busy={loading}>
          {response ? (
            <>
              <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.45fr_0.9fr]">
                <PrimaryDirectiveCard
                  response={response}
                  safeMarginPct={safeMarginPct}
                />
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
                <RoutingLogisticsPanel
                  markets={response.marketComparisons}
                  defaultMarketCode={activeRequest.defaultMarketCode}
                />
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
                  horizonHours={activeRequest.horizonHours}
                />
              </div>
            </>
          ) : (
            !analysisFailure && (
              <section
                role="status"
                className="mt-5 rounded-[2rem] border border-ink/10 bg-cream/85 p-8 text-center shadow-card"
              >
                <p className="font-display text-2xl font-semibold text-ink">
                  No analysis result yet.
                </p>
                <p className="mt-2 text-sm text-ink/70">
                  Choose a consignment above and run a safe-route analysis.
                </p>
              </section>
            )
          )}
        </div>
      </main>

      <footer className="mt-6 flex flex-col justify-between gap-2 border-t border-ink/10 py-5 font-mono text-[0.6875rem] uppercase tracking-[0.11em] text-ink/65 sm:flex-row">
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
    </div>
  );
}

function ChartLoading({ label }: { label: string }) {
  return (
    <section
      role="status"
      className="grid min-h-[20rem] place-items-center rounded-[2rem] border border-ink/10 bg-cream/85 p-6 shadow-card"
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink/75">
        <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
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
  const isOfflineDemo = response.analysisState?.kind === "offline_demo";
  const demo = response.forecastSource === "DEMO_FIXTURE";
  const fallback = response.forecastSource === "FALLBACK";
  const title = isOfflineDemo
    ? "ATIE API offline — showing demo fixture."
    : demo
      ? "Demo fixture is active."
      : fallback
        ? "Fallback forecast is active."
        : response.inputDataState === "CACHED"
          ? "Cached inputs are active."
          : "Seed inputs are active.";
  const detail =
    response.analysisState?.kind === "demo" ||
    response.analysisState?.kind === "offline_demo"
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
      className={`rise-in mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs leading-6 ${
        isOfflineDemo
          ? "border-clay/30 bg-[#f3d8cc]/85 text-[#6f2f1d]"
          : "border-amber/30 bg-[#f4e6bd]/80 text-[#5f440e]"
      }`}
    >
      <CloudOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <strong>{title}</strong> {detail}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss data-source notice"
        className="rounded-full p-1 opacity-70 transition hover:bg-ink/5 hover:opacity-100"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AnalysisFailureNotice({
  failure,
  onRetry,
  onDismiss,
}: {
  failure: AnalysisFailure;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="rise-in mb-5 flex flex-wrap items-start gap-3 rounded-2xl border border-clay/30 bg-[#f3d8cc]/90 px-4 py-3 text-xs leading-6 text-[#6f2f1d]"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
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
        onClick={onRetry}
        className="rounded-full border border-[#6f2f1d]/30 bg-white/75 px-3 py-1 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#6f2f1d] transition hover:bg-white"
      >
        Retry
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss analysis error"
        className="rounded-full p-1 opacity-70 transition hover:bg-ink/5 hover:opacity-100"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function shouldShowSourceNotice(response: AnalyzeResponse) {
  return (
    response.analysisState?.kind === "offline_demo" ||
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
  return sameInputs(left, right) && left.demoMode === right.demoMode;
}

function sameInputs(left: AnalyzeRequest, right: AnalyzeRequest) {
  return (
    left.originCode === right.originCode &&
    left.defaultMarketCode === right.defaultMarketCode &&
    left.cropCode === right.cropCode &&
    left.quantityKg === right.quantityKg &&
    left.vehicleType === right.vehicleType &&
    left.horizonHours === right.horizonHours
  );
}

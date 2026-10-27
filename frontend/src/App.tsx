import { useState } from "react";
import { CloudOff, Leaf, Map, RefreshCw } from "lucide-react";
import { analyzeConsignment } from "./api/atieClient";
import { ForecastTrajectoryChart } from "./components/ForecastTrajectoryChart";
import { ModelEvaluationBadge } from "./components/ModelEvaluationBadge";
import { OnboardingConfigModal } from "./components/OnboardingConfigModal";
import { PrimaryDirectiveCard } from "./components/PrimaryDirectiveCard";
import { ProfitMarginChart } from "./components/ProfitMarginChart";
import { RoutingLogisticsPanel } from "./components/RoutingLogisticsPanel";
import { WeatherDisruptionCard } from "./components/WeatherDisruptionCard";
import { demoRequest, demoResponse } from "./data/demoResponse";
import type { AnalyzeRequest, AnalyzeResponse } from "./types/atie";

const defaultRequest: AnalyzeRequest = {
  ...demoRequest,
  demoMode: false,
};

export default function App() {
  const [request, setRequest] = useState<AnalyzeRequest>(defaultRequest);
  const [response, setResponse] = useState<AnalyzeResponse>(demoResponse);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  async function run(nextRequest: AnalyzeRequest) {
    setRequest(nextRequest);
    setLoading(true);
    try {
      const result = await analyzeConsignment(nextRequest);
      setResponse(result);
      setHasRun(true);
    } finally {
      setLoading(false);
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
          <ModelEvaluationBadge summary={response.modelEvaluationSummary} />
          <button
            type="button"
            onClick={() => run({ ...request, demoMode: false })}
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

      {response.forecastSource === "DEMO_FIXTURE" && (
        <div className="rise-in mb-5 flex items-start gap-3 rounded-2xl border border-amber/30 bg-[#f4e6bd]/75 px-4 py-3 text-xs leading-6 text-[#6b4f16]">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Demo data is active.</strong> This is a verified competition
            fixture, not a live forecast. Start the API and use “Analyze market
            route” to request model or fallback predictions.
          </p>
        </div>
      )}

      <OnboardingConfigModal
        value={request}
        onChange={setRequest}
        onAnalyze={() => run({ ...request, demoMode: false })}
        onDemo={() => run(demoRequest)}
        loading={loading}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <PrimaryDirectiveCard response={response} />
        <WeatherDisruptionCard alerts={response.weatherAlerts} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ProfitMarginChart markets={response.marketComparisons} />
        <RoutingLogisticsPanel markets={response.marketComparisons} />
      </div>

      <div className="mt-5">
        <ForecastTrajectoryChart
          key={`${request.defaultMarketCode}-${request.cropCode}`}
          marketCode={request.defaultMarketCode}
          marketName={
            response.marketComparisons.find(
              (market) => market.marketCode === request.defaultMarketCode,
            )?.marketName ?? request.defaultMarketCode
          }
          cropCode={request.cropCode}
          forecastSource={response.forecastSource}
        />
      </div>

      <footer className="mt-6 flex flex-col justify-between gap-2 border-t border-ink/10 py-5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink/35 sm:flex-row">
        <span>ATIE · safe routing first</span>
        <span>
          {hasRun ? "Analysis refreshed" : "Showing verified demo fixture"} ·{" "}
          {response.modelVersion}
        </span>
      </footer>
    </main>
  );
}

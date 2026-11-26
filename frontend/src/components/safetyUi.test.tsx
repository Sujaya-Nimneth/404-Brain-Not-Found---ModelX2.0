import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { demoRequest, demoResponse } from "../data/demoResponse";
import type { AnalyzeRequest, AnalyzeResponse, DataStatus } from "../types/atie";
import { DataFreshnessPanel } from "./DataFreshnessPanel";
import { ErrorBoundary } from "./ErrorBoundary";
import { EvaluationBaselinesPanel } from "./EvaluationBaselinesPanel";
import { OnboardingConfigModal } from "./OnboardingConfigModal";
import { PrimaryDirectiveCard } from "./PrimaryDirectiveCard";
import { formatUpliftLabel, shortMarketName } from "./profitFormat";
import { RoutingLogisticsPanel } from "./RoutingLogisticsPanel";
import {
  buildTrajectoryChartData,
  formatTrajectoryDate,
} from "./trajectoryData";
import { formatLkr, roundHalfUp2 } from "../utils/format";

vi.mock("../api/atieClient", async () => {
  const actual = await vi.importActual<typeof import("../api/atieClient")>(
    "../api/atieClient",
  );
  return {
    ...actual,
    fetchMetadataConfig: vi.fn().mockRejectedValue(new Error("offline")),
  };
});

describe("safety-critical dashboard presentation", () => {
  it("uses the selected default market name in the crash warning", () => {
    const response: AnalyzeResponse = {
      ...demoResponse,
      primaryDirective: {
        ...demoResponse.primaryDirective,
        severity: "PROCEED_DEFAULT",
        recommendedMarketCode: null,
        profitDeltaLkr: null,
        profitUpliftPct: null,
      },
      marketComparisons: demoResponse.marketComparisons.map((market) =>
        market.marketCode === "DAMBULLA"
          ? { ...market, marketName: "Test Junction" }
          : market,
      ),
    };

    render(<PrimaryDirectiveCard response={response} />);

    expect(screen.getByText(/Test Junction prices are forecast/)).toBeVisible();
    expect(screen.queryByText(/Dambulla prices are forecast/)).toBeNull();
    expect(screen.getByText("Inputs SEED")).toBeVisible();
    expect(screen.getByText("Default")).toBeVisible();
    expect(screen.getByText("No reroute")).toBeVisible();
  });

  it("renders PROCEED_DEFAULT with backend 0.00 values as No reroute and neutral", () => {
    const proceedResponse: AnalyzeResponse = {
      ...demoResponse,
      primaryDirective: {
        ...demoResponse.primaryDirective,
        severity: "PROCEED_DEFAULT",
        recommendedMarketCode: null,
        profitDeltaLkr: 0,
        profitUpliftPct: 0,
      },
    };

    render(<PrimaryDirectiveCard response={proceedResponse} safeMarginPct={5} />);

    expect(screen.getByText("No reroute")).toBeVisible();
    expect(screen.getByText("below 5.00% floor")).toBeVisible();
    expect(screen.getByText("0.00")).toBeVisible();
  });

  it("renders CRITICAL_REROUTE with null uplift (NP_default <= 0) without saying No reroute", () => {
    const nullUpliftReroute: AnalyzeResponse = {
      ...demoResponse,
      primaryDirective: {
        ...demoResponse.primaryDirective,
        severity: "CRITICAL_REROUTE",
        recommendedMarketCode: "PETTAH_COLOMBO",
        profitDeltaLkr: 15000,
        profitUpliftPct: null,
      },
    };

    render(<PrimaryDirectiveCard response={nullUpliftReroute} />);

    expect(screen.queryByText("No reroute")).toBeNull();
    expect(screen.getByText("n/a")).toBeVisible();
    expect(screen.getByText("default profit ≤ 0")).toBeVisible();
    expect(screen.getByText("15,000.00")).toBeVisible();
  });

  it("displays Hold safety badges when directive severity is HOLD_HARVEST", () => {
    const holdResponse: AnalyzeResponse = {
      ...demoResponse,
      primaryDirective: {
        ...demoResponse.primaryDirective,
        severity: "HOLD_HARVEST",
        headline: "Hold harvest — net return is negative across reachable markets",
        explanation: "Every reachable market produces a weak net outcome.",
        recommendedMarketCode: null,
        profitDeltaLkr: null,
        profitUpliftPct: null,
      },
      marketComparisons: demoResponse.marketComparisons.map((market) => ({
        ...market,
        recommended: false,
      })),
    };

    render(<PrimaryDirectiveCard response={holdResponse} />);

    expect(screen.getAllByText("Hold")).toHaveLength(2);
    expect(screen.getByText("do not dispatch")).toBeVisible();
    expect(screen.getByText(/Hold dispatch until wholesale demand recovers/)).toBeVisible();
  });

  it("shows the route ledger's spot/forecast, gross revenue, fuel, trip, capacity, and 2-dp delta fields", () => {
    render(<RoutingLogisticsPanel markets={demoResponse.marketComparisons} />);

    expect(screen.getByText("410 km")).toBeVisible();
    expect(screen.getByText("32.8 L")).toBeVisible();
    expect(screen.getAllByText("1 trip")).toHaveLength(4);
    expect(screen.getAllByText("1,500 kg capacity")).toHaveLength(4);
    expect(screen.getByText("+23,238.58")).toBeVisible();
    expect(screen.getByText("181,734.38")).toBeVisible();
    expect(screen.getByText("969.25 kg sold")).toBeVisible();
    expect(screen.getByText("187.50")).toBeVisible();
  });

  it("renders both mandatory evaluation baselines", () => {
    render(
      <EvaluationBaselinesPanel
        summary={demoResponse.modelEvaluationSummary}
      />,
    );

    expect(screen.getByText("Trained model")).toBeVisible();
    expect(screen.getByText("Naive persistence")).toBeVisible();
    expect(screen.getByText("7-day moving average")).toBeVisible();
    expect(screen.getByText("93.81%")).toBeVisible();
    expect(screen.getByText("LKR 1.81")).toBeVisible();
  });

  it("formats positive, negative, baseline, and undefined profit uplifts cleanly", () => {
    const sample = demoResponse.marketComparisons[0];
    expect(
      formatUpliftLabel({ ...sample, profitDeltaLkr: 23238.58, profitUpliftPct: 15.84 }),
    ).toBe("+15.84%");
    expect(
      formatUpliftLabel({ ...sample, profitDeltaLkr: -5400, profitUpliftPct: -8.42 }),
    ).toBe("-8.42%");
    expect(
      formatUpliftLabel({ ...sample, profitDeltaLkr: 0, profitUpliftPct: 0 }),
    ).toBe("baseline");
    expect(formatUpliftLabel({ ...sample, profitDeltaLkr: 4200, profitUpliftPct: null })).toBe("n/a");
    expect(shortMarketName("Nuwara Eliya Dedicated Economic Centre")).toBe("N. Eliya");
    expect(roundHalfUp2(35.855)).toBe(35.86);
    expect(roundHalfUp2(-0.001)).toBe(0);
    expect(formatLkr(-0.001)).toBe("0.00");
  });

  it("allows clearing the harvest quantity field without forcing a leading zero", () => {
    function Harness() {
      const [req, setReq] = useState<AnalyzeRequest>(demoRequest);
      return (
        <OnboardingConfigModal
          value={req}
          onChange={setReq}
          onAnalyze={() => {}}
          onDemo={() => {}}
          loading={false}
        />
      );
    }

    render(<Harness />);
    const input = screen.getByLabelText(/Harvest \(kg\)/i) as HTMLInputElement;
    expect(input.value).toBe("1000");

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");

    fireEvent.change(input, { target: { value: "500" } });
    expect(input.value).toBe("500");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("500");
  });

  it("anchors the forecast trajectory 7-day moving average to the trailing 7-day window", () => {
    const chartPoints = buildTrajectoryChartData({
      marketCode: "DAMBULLA",
      marketName: "Dambulla",
      cropCode: "TOMATO",
      days: 7,
      referenceDate: "2026-10-27",
      forecastSource: "MODEL",
      modelVersion: "rf-v1.0",
      history: [
        { date: "2026-10-21", priceLkrPerKg: 210, arrivalVolumeTonnes: 40 },
        { date: "2026-10-22", priceLkrPerKg: 220, arrivalVolumeTonnes: 40 },
        { date: "2026-10-23", priceLkrPerKg: 230, arrivalVolumeTonnes: 40 },
        { date: "2026-10-24", priceLkrPerKg: 240, arrivalVolumeTonnes: 40 },
        { date: "2026-10-25", priceLkrPerKg: 250, arrivalVolumeTonnes: 40 },
        { date: "2026-10-26", priceLkrPerKg: 240, arrivalVolumeTonnes: 40 },
        { date: "2026-10-27", priceLkrPerKg: 220, arrivalVolumeTonnes: 40 },
      ],
      forecastTrajectory: [
        {
          horizonHours: 48,
          predictedPriceLkr: 190,
          baselineNaiveLkr: 220,
          baselineMa7Lkr: 230,
          direction: "CRASH",
        },
        {
          horizonHours: 72,
          predictedPriceLkr: 185,
          baselineNaiveLkr: 220,
          baselineMa7Lkr: 230,
          direction: "CRASH",
        },
      ],
    });

    const anchor = chartPoints[6];
    expect(anchor.actual).toBe(220);
    expect(anchor.model).toBe(220);
    expect(anchor.naive).toBe(220);
    expect(anchor.ma7).toBe(230);
  });

  it("guards invalid trajectory dates and renders DataFreshnessPanel secondary states", () => {
    expect(formatTrajectoryDate("not-a-date")).toBe("not-a-date");

    const status: DataStatus = {
      overallStatus: "PARTIAL",
      generatedAt: "2026-10-27T08:00:00Z",
      sources: [
        {
          sourceCode: "HDX",
          label: "WFP HDX Prices",
          dataState: "LIVE",
          freshness: "CURRENT",
          lastAttemptAt: "2026-10-27T07:00:00Z",
          lastSuccessAt: "2026-10-27T07:00:00Z",
          latestObservationDate: "2026-10-27",
          sourceUrl: "https://example.test",
          recordsWritten: 120,
          message: "HDX verified against latest feed.",
        },
      ],
      priceCoverage: [
        {
          marketCode: "DAMBULLA",
          cropCode: "TOMATO",
          latestObservationDate: "2026-10-27",
          source: "HDX_LIVE",
          state: "CURRENT",
        },
        {
          marketCode: "PETTAH_COLOMBO",
          cropCode: "TOMATO",
          latestObservationDate: "2026-10-20",
          source: "HDX_CACHED",
          state: "CACHED",
        },
        {
          marketCode: "JAFFNA",
          cropCode: "TOMATO",
          latestObservationDate: "2026-10-10",
          source: "HDX_SEED",
          state: "STALE",
        },
      ],
    };

    render(<DataFreshnessPanel status={status} unavailable={false} loading />);

    expect(screen.getByText("Refreshing")).toBeVisible();
    expect(screen.getByText("HDX verified against latest feed.")).toBeVisible();
    expect(screen.getByText("1 cached series")).toBeVisible();
    expect(screen.getByText("1 stale series")).toBeVisible();
  });

  it("recovers cleanly via ErrorBoundary and renders route baseline with defaultMarketCode", () => {
    let shouldThrow = true;
    function ProblemChild() {
      if (shouldThrow) {
        throw new Error("Simulated chart crash");
      }
      return <p>Recovered child view</p>;
    }

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Simulated chart crash")).toBeVisible();
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Reload dashboard" }));
    expect(screen.getByText("Recovered child view")).toBeVisible();

    render(
      <RoutingLogisticsPanel
        markets={demoResponse.marketComparisons}
        defaultMarketCode="DAMBULLA"
      />,
    );
    expect(screen.getByText("Default · crash")).toBeVisible();
  });
});

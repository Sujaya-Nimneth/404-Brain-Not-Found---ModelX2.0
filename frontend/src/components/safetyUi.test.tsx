import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { demoRequest, demoResponse } from "../data/demoResponse";
import type { AnalyzeRequest, AnalyzeResponse } from "../types/atie";
import { EvaluationBaselinesPanel } from "./EvaluationBaselinesPanel";
import { OnboardingConfigModal } from "./OnboardingConfigModal";
import { PrimaryDirectiveCard } from "./PrimaryDirectiveCard";
import { formatUpliftLabel, shortMarketName } from "./profitFormat";
import { RoutingLogisticsPanel } from "./RoutingLogisticsPanel";
import { buildTrajectoryChartData } from "./trajectoryData";

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
  });

  it("shows the route ledger's fuel, trip, capacity, and delta fields", () => {
    render(<RoutingLogisticsPanel markets={demoResponse.marketComparisons} />);

    expect(screen.getByText("410 km")).toBeVisible();
    expect(screen.getByText("32.8 L")).toBeVisible();
    expect(screen.getAllByText("1 trip")).toHaveLength(4);
    expect(screen.getAllByText("1,500 kg capacity")).toHaveLength(4);
    expect(screen.getByText("+23,239")).toBeVisible();
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
    expect(screen.getByText("67.45%")).toBeVisible();
    expect(screen.getByText("LKR 5.45")).toBeVisible();
  });

  it("formats positive, negative, baseline, and undefined profit uplifts cleanly", () => {
    const sample = demoResponse.marketComparisons[0];
    expect(
      formatUpliftLabel({ ...sample, profitDeltaLkr: 23238.58, profitUpliftPct: 15.84 }),
    ).toBe("+15.8%");
    expect(
      formatUpliftLabel({ ...sample, profitDeltaLkr: -5400, profitUpliftPct: -8.42 }),
    ).toBe("-8.4%");
    expect(
      formatUpliftLabel({ ...sample, profitDeltaLkr: 0, profitUpliftPct: 0 }),
    ).toBe("baseline");
    expect(
      formatUpliftLabel({ ...sample, profitDeltaLkr: 4200, profitUpliftPct: null }),
    ).toBe("n/a");
    expect(shortMarketName("Nuwara Eliya Dedicated Economic Centre")).toBe("N. Eliya");
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
});

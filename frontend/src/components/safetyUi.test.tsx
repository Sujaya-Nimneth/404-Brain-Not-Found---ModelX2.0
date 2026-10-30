import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoResponse } from "../data/demoResponse";
import type { AnalyzeResponse } from "../types/atie";
import { EvaluationBaselinesPanel } from "./EvaluationBaselinesPanel";
import { PrimaryDirectiveCard } from "./PrimaryDirectiveCard";
import { RoutingLogisticsPanel } from "./RoutingLogisticsPanel";

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
    expect(screen.getByText("67.89%")).toBeVisible();
    expect(screen.getByText("LKR 6.05")).toBeVisible();
  });
});

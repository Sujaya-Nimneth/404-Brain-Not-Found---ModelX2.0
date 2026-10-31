import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { demoRequest, demoResponse } from "../data/demoResponse";
import type { AnalyzeResponse } from "../types/atie";
import { EvaluationBaselinesPanel } from "./EvaluationBaselinesPanel";
import { OnboardingConfigModal } from "./OnboardingConfigModal";
import { PrimaryDirectiveCard } from "./PrimaryDirectiveCard";
import { formatUpliftLabel, shortMarketName } from "./profitFormat";
import { RoutingLogisticsPanel } from "./RoutingLogisticsPanel";

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
    expect(screen.getByText("67.89%")).toBeVisible();
    expect(screen.getByText("LKR 6.05")).toBeVisible();
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
      const [req, setReq] = useState(demoRequest);
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
});

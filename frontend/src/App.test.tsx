import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as atieClient from "./api/atieClient";
import { demoResponse } from "./data/demoResponse";
import type { AnalyzeResponse } from "./types/atie";

vi.mock("./api/atieClient", async () => {
  const actual =
    await vi.importActual<typeof import("./api/atieClient")>(
      "./api/atieClient",
    );
  return {
    ...actual,
    analyzeConsignment: vi.fn(),
    fetchDataStatus: vi.fn(),
    fetchMetadataConfig: vi.fn(),
    fetchMarketHistory: vi.fn(),
  };
});

vi.mock("./components/ProfitMarginChart", () => ({
  ProfitMarginChart: () => null,
}));

vi.mock("./components/ForecastTrajectoryChart", () => ({
  ForecastTrajectoryChart: () => null,
}));

describe("App state handling", () => {
  beforeEach(() => {
    vi.mocked(atieClient.fetchDataStatus).mockRejectedValue(
      new Error("status offline"),
    );
    vi.mocked(atieClient.fetchMetadataConfig).mockRejectedValue(
      new Error("metadata offline"),
    );
    vi.mocked(atieClient.fetchMarketHistory).mockRejectedValue(
      new Error("history offline"),
    );
  });

  it("does not substitute the demo fixture for an unrelated failed request", async () => {
    vi.mocked(atieClient.analyzeConsignment).mockRejectedValue(
      new atieClient.AtieApiError(
        "Forecast service unavailable",
        503,
        "ML_UNAVAILABLE",
        "req-123",
      ),
    );
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Reroute to Colombo Pettah" }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Analyze market route" }),
    );

    const failureText = await screen.findByText(/No demo fixture was substituted/);
    const alert = failureText.closest('[role="alert"]');
    expect(alert).not.toBeNull();
    if (!alert) throw new Error("analysis failure alert is missing");
    expect(alert).toHaveTextContent("Analysis failed.");
    expect(alert).toHaveTextContent("No demo fixture was substituted");
    expect(alert).toHaveTextContent("ML_UNAVAILABLE");
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Reroute to Colombo Pettah" }),
      ).toBeNull();
    });
  });

  it("dismisses the active data-source notice", () => {
    render(<App />);

    expect(screen.getByText("Demo fixture is active.")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss data-source notice" }),
    );

    expect(screen.queryByText("Demo fixture is active.")).toBeNull();
  });

  it("cancels superseded in-flight analysis requests and refreshes data status", async () => {
    let resolveSlowLive!: (value: AnalyzeResponse) => void;
    const signals: Array<AbortSignal | undefined> = [];

    vi.mocked(atieClient.analyzeConsignment).mockImplementation(
      (req, signal) => {
        signals.push(signal);
        if (!req.demoMode) {
          return new Promise<AnalyzeResponse>((resolve) => {
            resolveSlowLive = resolve;
          });
        }
        return Promise.resolve({
          ...demoResponse,
          primaryDirective: {
            ...demoResponse.primaryDirective,
            headline: "Demo fixture winner",
          },
        });
      },
    );

    render(<App />);
    expect(atieClient.fetchDataStatus).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh analysis" }),
    );
    expect(atieClient.fetchDataStatus).toHaveBeenCalledTimes(2);

    fireEvent.click(
      screen.getByRole("button", { name: "Load Northern glut demo" }),
    );
    expect(signals[0]?.aborted).toBe(true);
    expect(
      await screen.findByRole("heading", { name: "Demo fixture winner" }),
    ).toBeVisible();

    resolveSlowLive({
      ...demoResponse,
      forecastSource: "MODEL",
      primaryDirective: {
        ...demoResponse.primaryDirective,
        headline: "Stale live response",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Demo fixture winner" }),
      ).toBeVisible();
      expect(
        screen.queryByRole("heading", { name: "Stale live response" }),
      ).toBeNull();
    });
  });
});

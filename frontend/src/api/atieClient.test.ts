import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeConsignment } from "./atieClient";
import { ApiContractError } from "./mappers";
import { demoRequest } from "../data/demoResponse";

describe("atieClient contract error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rethrows ApiContractError instead of substituting offline demo data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ unexpected: "shape" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(analyzeConsignment(demoRequest)).rejects.toBeInstanceOf(
      ApiContractError,
    );
  });

  it("marks offline canonical demo fallback explicitly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    const response = await analyzeConsignment(demoRequest);
    expect(response.forecastSource).toBe("DEMO_FIXTURE");
    expect(response.analysisState?.kind).toBe("offline_demo");
    if (response.analysisState?.kind === "offline_demo") {
      expect(response.analysisState.message).toMatch(/offline/i);
    }
  });
});

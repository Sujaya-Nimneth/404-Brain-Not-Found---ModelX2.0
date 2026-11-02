import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApiContractError,
  mapAnalyzeResponse,
  mapMarketHistoryResponse,
} from "../../src/api/mappers.ts";
import { buildTrajectoryChartData } from "../../src/components/trajectoryData.ts";
import {
  ANDROID_EMULATOR_GATEWAY_URL,
  createRequestId,
  deriveDirectBackendFallbackUrl,
  extractLanHostFromExpoUri,
  normalizeBaseUrl,
  resolveDefaultAndroidBaseUrl,
} from "./api/endpointResolver.ts";
import {
  demoRequest,
  demoResponse,
  fallbackMetadataConfig,
  filterReachableMarkets,
  getOfflineDemoHistory,
  resolveValidOriginSelection,
} from "./data/metadata.ts";
import { buildDispatchMessage } from "./utils/dispatchMessage.ts";
import {
  computeTripsAndLoad,
  findMatchingCachedResult,
  formatMetricPct,
  formatSignedCurrency,
  formatSignedLkr,
  formatSignedPct,
  sameRequest,
} from "./utils/format.ts";

describe("ATIE Android Option A — Normative Contracts & Field UX", () => {
  it("preserves exact canonical competition fixture acceptance values", () => {
    assert.equal(demoRequest.originCode, "ANURADHAPURA");
    assert.equal(demoRequest.defaultMarketCode, "DAMBULLA");
    assert.equal(demoRequest.cropCode, "TOMATO");
    assert.equal(demoRequest.quantityKg, 1000);
    assert.equal(demoRequest.vehicleType, "MINI_TRUCK_BATTA");
    assert.equal(demoRequest.horizonHours, 48);
    assert.equal(demoRequest.demoMode, true);

    assert.equal(demoResponse.forecastSource, "DEMO_FIXTURE");
    assert.equal(demoResponse.primaryDirective.severity, "CRITICAL_REROUTE");
    assert.equal(
      demoResponse.primaryDirective.recommendedMarketCode,
      "PETTAH_COLOMBO",
    );
    assert.equal(demoResponse.primaryDirective.profitDeltaLkr, 23238.58);
    assert.equal(demoResponse.primaryDirective.profitUpliftPct, 15.84);
  });

  it("maps backend snake_case payload using shared normative mappers (is_recommended & null uplift)", () => {
    const mapped = mapAnalyzeResponse({
      forecast_source: "MODEL",
      input_data_state: "SEED",
      model_version: "rf-v1.0",
      reference_date: "2026-10-27",
      primary_directive: {
        severity: "HOLD_HARVEST",
        headline: "Hold harvest",
        explanation: "Default market profit is non-positive.",
        default_market_code: "DAMBULLA",
        recommended_market_code: null,
        profit_delta_lkr: null,
        profit_uplift_pct: null,
      },
      market_comparisons: [
        {
          market_code: "DAMBULLA",
          market_name: "Dambulla",
          current_price_lkr: 50,
          predicted_price_lkr: 40,
          gross_revenue_lkr: 3958,
          transport_cost_lkr: 3169.6,
          spoilage_loss_lkr: 42,
          handling_cost_lkr: 2500,
          net_profit_lkr: -1711.6,
          distance_km: 70,
          profit_delta_lkr: 0,
          profit_uplift_pct: null,
          fuel_litres: 11.2,
          trips: 1,
          vehicle_capacity_kg: 1500,
          is_recommended: false,
          direction: "CRASH",
        },
      ],
      weather_alerts: [],
      model_evaluation_summary: {
        available: true,
        message: null,
        model_directional_symmetry_pct: 68.03,
        model_mae_lkr: 5.95,
        model_safe_margin_fpr: {
          safe_margin_fpr_pct: null,
          reroute_count: 0,
          false_reroute_count: 0,
        },
        naive_directional_symmetry_pct: 0,
        naive_mae_lkr: 7.0,
        naive_safe_margin_fpr: {
          safe_margin_fpr_pct: 4.44,
          reroute_count: 100,
          false_reroute_count: 4,
        },
        ma7_directional_symmetry_pct: 46.5,
        ma7_mae_lkr: 9.45,
        ma7_safe_margin_fpr: {
          safe_margin_fpr_pct: 7.63,
          reroute_count: 120,
          false_reroute_count: 9,
        },
      },
    });

    assert.equal(mapped.primaryDirective.profitUpliftPct, null);
    assert.equal(mapped.marketComparisons[0].recommended, false);
    assert.equal(
      mapped.modelEvaluationSummary.modelSafeMarginFpr?.safeMarginFprPct,
      null,
    );
    assert.equal(mapped.modelEvaluationSummary.ma7DirectionalSymmetryPct, 46.5);

    assert.throws(
      () => mapAnalyzeResponse({ forecast_source: "INVALID_SOURCE" }),
      ApiContractError,
    );
  });

  it("enforces CONTRACTS.md §3 origin/market separation and route filtering", () => {
    const marketCodes = fallbackMetadataConfig.markets.map((m) => m.code);
    assert.equal(
      marketCodes.includes("ANURADHAPURA"),
      false,
      "ANURADHAPURA must never be seeded as a destination market",
    );
    assert.equal(
      marketCodes.includes("JAFFNA"),
      true,
      "JAFFNA market must be available",
    );
    assert.deepEqual(
      fallbackMetadataConfig.crops.map((c) => c.code),
      ["TOMATO", "CARROT", "GREEN_CHILI", "RED_ONION"],
    );

    for (const origin of fallbackMetadataConfig.origins) {
      const reachable = filterReachableMarkets(
        fallbackMetadataConfig,
        origin.code,
      );
      assert.equal(reachable.length, 7);
    }

    const restrictedConfig = {
      ...fallbackMetadataConfig,
      routes: [
        {
          originCode: "JAFFNA",
          marketCode: "PETTAH_COLOMBO",
          distanceKm: 400,
          terrainFactor: 1.0,
        },
      ],
    };
    const adjusted = resolveValidOriginSelection(
      restrictedConfig,
      demoRequest,
      "JAFFNA",
    );
    assert.equal(adjusted.originCode, "JAFFNA");
    assert.equal(adjusted.defaultMarketCode, "PETTAH_COLOMBO");
  });

  it("formats signed negative deltas and nullable SM-FPR safely without +- or bare %", () => {
    assert.equal(formatSignedPct(15.84), "+15.84%");
    assert.equal(formatSignedPct(-4.2), "-4.20%");
    assert.equal(formatSignedPct(null), "n/a");
    assert.equal(formatSignedLkr(-1250), "-1,250");
    assert.equal(formatSignedCurrency(-1250), "-LKR 1,250");
    assert.equal(formatMetricPct(null), "—");
    assert.equal(formatMetricPct(2.59, 2), "2.59%");
    assert.deepEqual(computeTripsAndLoad(1600, 1500), {
      trips: 2,
      loadUtilizationPct: 53,
    });
  });

  it("resolves Android Emulator gateway, physical LAN Expo host, and :8080 direct fallback", () => {
    assert.equal(
      extractLanHostFromExpoUri("192.168.1.42:8081"),
      "192.168.1.42",
    );
    assert.equal(extractLanHostFromExpoUri("localhost:8081"), null);
    assert.equal(
      resolveDefaultAndroidBaseUrl(null, "192.168.1.42:8081"),
      "http://192.168.1.42:15173/api/v1",
    );
    assert.equal(
      resolveDefaultAndroidBaseUrl(null, null),
      ANDROID_EMULATOR_GATEWAY_URL,
    );
    assert.equal(
      deriveDirectBackendFallbackUrl("http://10.0.2.2:15173/api/v1"),
      "http://10.0.2.2:8080/api/v1",
    );
    assert.equal(
      normalizeBaseUrl("http://192.168.1.10:8080/"),
      "http://192.168.1.10:8080/api/v1",
    );
    assert.match(createRequestId(), /^[A-Za-z0-9._-]{1,64}$/);
  });

  it("enforces exact consignment equality and generates trilingual WhatsApp/SMS dispatch slips", () => {
    assert.equal(sameRequest(demoRequest, { ...demoRequest }), true);
    assert.equal(
      sameRequest(demoRequest, { ...demoRequest, demoMode: false }),
      false,
    );

    const enSlip = buildDispatchMessage(demoRequest, demoResponse, "en");
    assert.match(enSlip, /CRITICAL REROUTE/);
    assert.match(enSlip, /Colombo Pettah/);
    assert.match(enSlip, /DEMO FIXTURE · SEED/);

    const siSlip = buildDispatchMessage(demoRequest, demoResponse, "si");
    assert.match(siSlip, /තක්කාලි/);
    assert.match(siSlip, /කොළඹ පිටකොටුව/);

    const taSlip = buildDispatchMessage(demoRequest, demoResponse, "ta");
    assert.match(taSlip, /தக்காளி/);
    assert.match(taSlip, /கொழும்பு புறக்கோட்டை/);

    const demoSnapshot = {
      request: demoRequest,
      response: demoResponse,
      savedAtIso: "2026-10-27T08:00:00Z",
    };
    assert.equal(
      findMatchingCachedResult(demoSnapshot, demoRequest),
      null,
      "DEMO_FIXTURE must never be reused as an offline live cache snapshot",
    );

    const liveReq = { ...demoRequest, demoMode: false };
    const liveSnapshot = {
      request: liveReq,
      response: { ...demoResponse, forecastSource: "MODEL" as const },
      savedAtIso: "2026-10-27T08:00:00Z",
    };
    assert.deepEqual(
      findMatchingCachedResult(liveSnapshot, liveReq),
      liveSnapshot,
    );
    assert.equal(
      findMatchingCachedResult(liveSnapshot, {
        ...liveReq,
        cropCode: "CARROT",
      }),
      null,
      "Cached snapshot must never be substituted for an unrelated consignment",
    );
  });

  it("builds valid 14-day + 48/72h trajectory points for offline canonical demo history", () => {
    const demoHist = getOfflineDemoHistory("DAMBULLA", "TOMATO");
    assert.ok(demoHist);
    const validated = mapMarketHistoryResponse({
      market_code: demoHist.marketCode,
      market_name: demoHist.marketName,
      crop_code: demoHist.cropCode,
      days: demoHist.days,
      reference_date: demoHist.referenceDate,
      forecast_source: demoHist.forecastSource,
      model_version: demoHist.modelVersion,
      history: demoHist.history.map((h) => ({
        date: h.date,
        price_lkr_per_kg: h.priceLkrPerKg,
        arrival_volume_tonnes: h.arrivalVolumeTonnes,
      })),
      forecast_trajectory: demoHist.forecastTrajectory.map((f) => ({
        horizon_hours: f.horizonHours,
        predicted_price_lkr: f.predictedPriceLkr,
        baseline_naive_lkr: f.baselineNaiveLkr,
        baseline_ma7_lkr: f.baselineMa7Lkr,
        direction: f.direction,
      })),
    });
    const chartPoints = buildTrajectoryChartData(validated);
    assert.equal(chartPoints.length, 16);
    assert.equal(chartPoints[14].model, 154);
    assert.equal(getOfflineDemoHistory("DAMBULLA", "CARROT"), null);
  });
});

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
import {
  validateCachedMetadata,
  validateCachedResultSnapshot,
} from "./storage/offlineCache.ts";
import type { AnalyzeResponse, CachedResultSnapshot } from "./types/atie.ts";
import { buildDispatchMessage } from "./utils/dispatchMessage.ts";
import {
  computeTripsAndLoad,
  DEFAULT_OFFLINE_CACHE_TTL_MS,
  findMatchingCachedResult,
  formatInteger,
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
      model_version: "xgb-v2.0",
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
          pct_change: -20,
          effective_volume_kg: 989.5,
          glut_risk_level: "HIGH",
          confidence_score: 0.88,
          primary_driver: "Oversupply depresses wholesale bids.",
        },
      ],
      weather_alerts: [],
      model_evaluation_summary: {
        available: true,
        message: null,
        model_directional_symmetry_pct: 93.81,
        model_mae_lkr: 1.81,
        model_safe_margin_fpr: {
          safe_margin_fpr_pct: null,
          reroute_count: 0,
          false_reroute_count: 0,
        },
        naive_directional_symmetry_pct: 0,
        naive_mae_lkr: 12.25,
        naive_safe_margin_fpr: {
          safe_margin_fpr_pct: 24.65,
          reroute_count: 2126,
          false_reroute_count: 524,
        },
        ma7_directional_symmetry_pct: 40.99,
        ma7_mae_lkr: 16.35,
        ma7_safe_margin_fpr: {
          safe_margin_fpr_pct: 23.59,
          reroute_count: 1522,
          false_reroute_count: 359,
        },
      },
    });

    assert.equal(mapped.primaryDirective.profitUpliftPct, null);
    assert.equal(mapped.marketComparisons[0].recommended, false);
    assert.equal(mapped.marketComparisons[0].pctChange, -20);
    assert.equal(
      mapped.modelEvaluationSummary.modelSafeMarginFpr?.safeMarginFprPct,
      null,
    );
    assert.equal(mapped.modelEvaluationSummary.ma7DirectionalSymmetryPct, 40.99);

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
    assert.equal(fallbackMetadataConfig.fuelPrices.effectiveDate, "2026-10-01");

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

  it("formats 2-decimal HALF_UP currency deltas, integers, and nullable SM-FPR safely", () => {
    assert.equal(formatSignedPct(15.84), "+15.84%");
    assert.equal(formatSignedPct(-4.2), "-4.20%");
    assert.equal(formatSignedPct(null), "n/a");
    assert.equal(formatSignedLkr(23238.58), "+23,238.58");
    assert.equal(formatSignedLkr(-1250), "-1,250.00");
    assert.equal(formatSignedCurrency(-1250), "-LKR 1,250.00");
    assert.equal(formatInteger(1000), "1,000");
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

  it("enforces HOLD_HARVEST dispatch slip safety, trilingual slips, and cache TTL validation", () => {
    assert.equal(sameRequest(demoRequest, { ...demoRequest }), true);
    assert.equal(
      sameRequest(demoRequest, { ...demoRequest, demoMode: false }),
      false,
    );

    const enSlip = buildDispatchMessage(demoRequest, demoResponse, "en");
    assert.match(enSlip, /CRITICAL REROUTE/);
    assert.match(enSlip, /Colombo Pettah/);
    assert.match(enSlip, /\+LKR 23,238\.58/);
    assert.match(enSlip, /DEMO FIXTURE · SEED/);

    const siSlip = buildDispatchMessage(demoRequest, demoResponse, "si");
    assert.match(siSlip, /තක්කාලි/);
    assert.match(siSlip, /කොළඹ පිටකොටුව/);

    const taSlip = buildDispatchMessage(demoRequest, demoResponse, "ta");
    assert.match(taSlip, /தக்காளி/);
    assert.match(taSlip, /கொழும்பு புறக்கோட்டை/);

    const holdResponse: AnalyzeResponse = {
      ...demoResponse,
      forecastSource: "MODEL",
      primaryDirective: {
        severity: "HOLD_HARVEST",
        headline: "Hold harvest — net return is negative",
        explanation: "Every reachable market produces a weak net outcome.",
        defaultMarketCode: "DAMBULLA",
        recommendedMarketCode: null,
        profitDeltaLkr: null,
        profitUpliftPct: null,
      },
      marketComparisons: demoResponse.marketComparisons.map((m) =>
        m.marketCode === "DAMBULLA"
          ? { ...m, netProfitLkr: -1711.6, recommended: false }
          : { ...m, recommended: false },
      ),
    };
    const enHoldSlip = buildDispatchMessage(demoRequest, holdResponse, "en");
    assert.match(enHoldSlip, /DO NOT DISPATCH — HOLD HARVEST/);
    assert.doesNotMatch(enHoldSlip, /📍/);
    assert.doesNotMatch(enHoldSlip, /🚛/);

    const siHoldSlip = buildDispatchMessage(demoRequest, holdResponse, "si");
    assert.match(siHoldSlip, /අස්වැන්න පිටත් නොකරන්න/);
    assert.doesNotMatch(siHoldSlip, /📍/);

    const taHoldSlip = buildDispatchMessage(demoRequest, holdResponse, "ta");
    assert.match(taHoldSlip, /வாகனத்தை அனுப்ப வேண்டாம்/);
    assert.doesNotMatch(taHoldSlip, /📍/);

    const refNow = Date.parse("2026-10-27T12:00:00Z");
    const demoSnapshot: CachedResultSnapshot = {
      request: demoRequest,
      response: demoResponse,
      cachedAt: "2026-10-27T08:00:00Z",
    };
    assert.equal(
      findMatchingCachedResult(demoSnapshot, demoRequest, refNow),
      null,
      "DEMO_FIXTURE must never be reused as an offline live cache snapshot",
    );
    assert.equal(
      validateCachedResultSnapshot(demoSnapshot, refNow),
      null,
      "Persisted cache validator must reject DEMO_FIXTURE snapshots",
    );

    const liveReq = { ...demoRequest, demoMode: false };
    const liveSnapshot: CachedResultSnapshot = {
      request: liveReq,
      response: { ...demoResponse, forecastSource: "MODEL" },
      cachedAt: "2026-10-27T08:00:00Z",
    };
    assert.deepEqual(
      findMatchingCachedResult(liveSnapshot, liveReq, refNow),
      liveSnapshot,
    );
    assert.deepEqual(
      validateCachedResultSnapshot(liveSnapshot, refNow),
      liveSnapshot,
    );
    assert.equal(
      findMatchingCachedResult(
        liveSnapshot,
        liveReq,
        refNow + DEFAULT_OFFLINE_CACHE_TTL_MS + 60_000,
      ),
      null,
      "Expired offline cache snapshot beyond 72h TTL must be rejected",
    );
    assert.equal(
      findMatchingCachedResult(
        liveSnapshot,
        {
          ...liveReq,
          cropCode: "CARROT",
        },
        refNow,
      ),
      null,
      "Cached snapshot must never be substituted for an unrelated consignment",
    );
    assert.ok(validateCachedMetadata(fallbackMetadataConfig));
    assert.equal(validateCachedMetadata({ broken: true }), null);
  });

  it("builds valid 14-day + 48/72h trajectory points for all 7 markets in offline demo history", () => {
    for (const market of fallbackMetadataConfig.markets) {
      const demoHist = getOfflineDemoHistory(market.code, "TOMATO");
      assert.ok(demoHist, `Missing offline demo history for ${market.code}`);
      if (!demoHist) {
        throw new Error(`Missing offline demo history for ${market.code}`);
      }
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
      if (market.code === "DAMBULLA") {
        assert.equal(chartPoints[14].model, 154);
        assert.equal(chartPoints[15].model, 155);
      }
    }
    assert.equal(getOfflineDemoHistory("DAMBULLA", "CARROT"), null);
  });
});

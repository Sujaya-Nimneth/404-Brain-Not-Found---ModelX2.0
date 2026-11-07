import { describe, expect, it } from "vitest";
import {
  ApiContractError,
  mapAnalyzeResponse,
  mapDataStatus,
  mapMarketHistoryResponse,
  mapMetadataConfig,
} from "./mappers";

describe("ATIE API contract mappers", () => {
  it("maps the snake_case directive payload field by field", () => {
    const response = mapAnalyzeResponse({
      forecast_source: "MODEL",
      input_data_state: "LIVE",
      model_version: "rf-v1.0",
      reference_date: "2026-10-27",
      primary_directive: {
        severity: "CRITICAL_REROUTE",
        headline: "Reroute to Colombo Pettah",
        explanation: "Net profit is higher.",
        default_market_code: "DAMBULLA",
        recommended_market_code: "PETTAH_COLOMBO",
        profit_delta_lkr: 23238.58,
        profit_uplift_pct: 15.84,
      },
      market_comparisons: [
        {
          market_code: "PETTAH_COLOMBO",
          market_name: "Colombo Pettah",
          current_price_lkr: 170,
          predicted_price_lkr: 187.5,
          gross_revenue_lkr: 181734.38,
          transport_cost_lkr: 9282.4,
          spoilage_loss_lkr: 5765.63,
          handling_cost_lkr: 2500,
          net_profit_lkr: 169951.98,
          distance_km: 205,
          profit_delta_lkr: 23238.58,
          profit_uplift_pct: 15.84,
          fuel_litres: 32.8,
          trips: 1,
          vehicle_capacity_kg: 1500,
          is_recommended: true,
          direction: "SURGE",
          pct_change: 10.29,
          effective_volume_kg: 969.25,
          glut_risk_level: "LOW",
          confidence_score: 0.87,
          primary_driver: "Low arrivals keep Colombo wholesale firm.",
        },
      ],
      weather_alerts: [
        {
          market_code: "PETTAH_COLOMBO",
          risk_level: "LOW",
          message: "Clear routes.",
          precipitation_mm: 4.1,
          extreme_weather: false,
          source: "OPEN_METEO_LIVE",
          observation_date: "2026-10-27",
        },
      ],
      model_evaluation_summary: {
        available: true,
        message: null,
        model_directional_symmetry_pct: 67.89,
        model_mae_lkr: 6.05,
        model_safe_margin_fpr: {
          safe_margin_fpr_pct: 3,
          reroute_count: 6502,
          false_reroute_count: 195,
        },
        naive_directional_symmetry_pct: 0,
        naive_mae_lkr: 6.98,
        naive_safe_margin_fpr: null,
        ma7_directional_symmetry_pct: 46.67,
        ma7_mae_lkr: 9.41,
        ma7_safe_margin_fpr: {
          safe_margin_fpr_pct: 7.25,
          reroute_count: 5531,
          false_reroute_count: 401,
        },
      },
    });

    expect(response.inputDataState).toBe("LIVE");
    expect(response.primaryDirective.profitDeltaLkr).toBe(23238.58);
    expect(response.marketComparisons[0]).toMatchObject({
      marketCode: "PETTAH_COLOMBO",
      profitDeltaLkr: 23238.58,
      fuelLitres: 32.8,
      trips: 1,
      vehicleCapacityKg: 1500,
      recommended: true,
      pctChange: 10.29,
      effectiveVolumeKg: 969.25,
      glutRiskLevel: "LOW",
      confidenceScore: 0.87,
      primaryDriver: "Low arrivals keep Colombo wholesale firm.",
    });
    expect(response.modelEvaluationSummary.modelSafeMarginFpr).toEqual({
      safeMarginFprPct: 3,
      rerouteCount: 6502,
      falseRerouteCount: 195,
    });
  });

  it("rejects missing or legacy camelCase fields instead of casting them", () => {
    expect(() =>
      mapAnalyzeResponse({
        forecast_source: "MODEL",
        model_version: "rf-v1.0",
        reference_date: "2026-10-27",
      }),
    ).toThrowError(ApiContractError);

    expect(() =>
      mapAnalyzeResponse({
        forecast_source: "MODEL",
        input_data_state: "LIVE",
        model_version: "rf-v1.0",
        reference_date: "2026-10-27",
        primary_directive: {
          severity: "PROCEED_DEFAULT",
          headline: "Proceed",
          explanation: "Safe.",
          defaultMarketCode: "DAMBULLA",
          recommendedMarketCode: null,
          profitDeltaLkr: null,
          profitUpliftPct: null,
        },
        market_comparisons: [],
        weather_alerts: [],
        model_evaluation_summary: {
          available: false,
          message: "Unavailable",
          model_directional_symmetry_pct: null,
          model_mae_lkr: null,
          model_safe_margin_fpr: null,
          naive_directional_symmetry_pct: null,
          naive_mae_lkr: null,
          naive_safe_margin_fpr: null,
          ma7_directional_symmetry_pct: null,
          ma7_mae_lkr: null,
          ma7_safe_margin_fpr: null,
        },
      }),
    ).toThrowError(/default_market_code/);
  });

  it("maps history and metadata nested snake_case values", () => {
    const history = mapMarketHistoryResponse({
      market_code: "DAMBULLA",
      market_name: "Dambulla",
      crop_code: "TOMATO",
      days: 14,
      reference_date: "2026-10-27",
      forecast_source: "MODEL",
      model_version: "rf-v1.0",
      history: [
        {
          date: "2026-10-27",
          price_lkr_per_kg: 220,
          arrival_volume_tonnes: null,
        },
      ],
      forecast_trajectory: [
        {
          horizon_hours: 48,
          predicted_price_lkr: 154,
          baseline_naive_lkr: 220,
          baseline_ma7_lkr: 237.76,
          direction: "CRASH",
        },
      ],
    });
    expect(history.history[0].priceLkrPerKg).toBe(220);
    expect(history.forecastTrajectory[0].baselineMa7Lkr).toBe(237.76);

    const metadata = mapMetadataConfig({
      origins: [
        {
          code: "ANURADHAPURA",
          name: "Anuradhapura",
          district: "Anuradhapura",
          province: "North Central",
          latitude: 8.3114,
          longitude: 80.4037,
          supply_zone: "NORTH_CENTRAL",
        },
      ],
      markets: [
        {
          code: "DAMBULLA",
          name: "Dambulla",
          province: "Central",
          latitude: 7.86,
          longitude: 80.65,
          handling_fee_per_kg_lkr: 2.5,
        },
      ],
      crops: [
        {
          code: "TOMATO",
          name: "Tomato",
          spoilage_rate_per_100km_pct: 1.5,
        },
      ],
      routes: [
        {
          origin_code: "ANURADHAPURA",
          market_code: "DAMBULLA",
          distance_km: 70,
          terrain_factor: 1,
        },
      ],
      vehicle_types: [
        {
          code: "MINI_TRUCK_BATTA",
          display_name: "Batta mini-truck",
          capacity_kg: 1500,
          litres_per_km: 0.08,
          fuel_type: "DIESEL",
        },
      ],
      horizons: [48, 72],
      fuel_prices: {
        effective_date: "2026-10-20",
        diesel_lkr_per_liter: 283,
        petrol_lkr_per_liter: 311,
      },
      thresholds: {
        safe_margin_pct: 5,
        safe_absolute_floor_lkr: 1000,
        movement_threshold_pct: 10,
      },
    });
    expect(metadata.origins[0].supplyZone).toBe("NORTH_CENTRAL");
    expect(metadata.vehicleTypes[0].capacityKg).toBe(1500);
    expect(metadata.thresholds.safeMarginPct).toBe(5);

    const withoutFuel = mapMetadataConfig({
      origins: [],
      markets: [],
      crops: [],
      routes: [],
      vehicle_types: [],
      horizons: [48, 72],
      fuel_prices: null,
      thresholds: {
        safe_margin_pct: 5,
        safe_absolute_floor_lkr: 1000,
        movement_threshold_pct: 10,
      },
    });
    expect(withoutFuel.fuelPrices).toEqual({
      effectiveDate: null,
      dieselLkrPerLiter: null,
      petrolLkrPerLiter: null,
    });
  });

  it("maps source provenance without leaking snake_case into the UI model", () => {
    const status = mapDataStatus({
      overall_status: "PARTIAL",
      generated_at: "2026-10-30T00:00:00Z",
      sources: [
        {
          source_code: "HDX",
          label: "WFP / HDX",
          data_state: "LIVE",
          freshness: "CURRENT",
          last_attempt_at: "2026-10-30T00:00:00Z",
          last_success_at: "2026-10-30T00:00:00Z",
          latest_observation_date: "2026-10-01",
          source_url: "https://data.humdata.org/example.csv",
          records_written: 42,
          message: null,
        },
      ],
      price_coverage: [
        {
          market_code: "DAMBULLA",
          crop_code: "TOMATO",
          latest_observation_date: "2026-10-01",
          source: "HDX_LIVE",
          state: "CURRENT",
        },
      ],
    });
    expect(status.sources[0].recordsWritten).toBe(42);
    expect(status.priceCoverage[0].marketCode).toBe("DAMBULLA");
  });
});

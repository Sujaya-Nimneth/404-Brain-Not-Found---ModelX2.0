import type {
  AnalyzeResponse,
  DataStatus,
  ForecastSource,
  InputDataState,
  MarketComparison,
  MarketHistoryResponse,
  MetadataConfig,
  ModelEvaluationSummary,
  SafeMarginFpr,
} from "../types/atie";

type JsonObject = Record<string, unknown>;

const forecastSources = [
  "MODEL",
  "FALLBACK",
  "DEMO_FIXTURE",
] as const satisfies readonly ForecastSource[];
const inputDataStates = [
  "LIVE",
  "CACHED",
  "SEED",
] as const satisfies readonly InputDataState[];
const directions = ["CRASH", "STABLE", "SURGE"] as const;
const riskLevels = ["LOW", "MEDIUM", "HIGH"] as const;
const vehicleTypes = [
  "THREE_WHEELER",
  "MINI_TRUCK_BATTA",
  "LORRY_3_5T",
] as const;
const dataStates = ["LIVE", "CACHED", "SEED", "UNAVAILABLE"] as const;
const freshnessStates = ["CURRENT", "STALE", "UNKNOWN"] as const;
const coverageStates = [
  "CURRENT",
  "STALE",
  "SEED",
  "CACHED",
  "UNAVAILABLE",
  "UNKNOWN",
] as const;

export class ApiContractError extends Error {
  constructor(path: string, expectation: string) {
    super(`ATIE API contract error at ${path}: expected ${expectation}`);
    this.name = "ApiContractError";
  }
}

export function mapAnalyzeResponse(payload: unknown): AnalyzeResponse {
  const root = objectAt(payload, "$");
  return {
    forecastSource: enumAt(root.forecast_source, forecastSources, "$.forecast_source"),
    inputDataState: enumAt(
      root.input_data_state,
      inputDataStates,
      "$.input_data_state",
    ),
    modelVersion: stringAt(root.model_version, "$.model_version"),
    referenceDate: stringAt(root.reference_date, "$.reference_date"),
    primaryDirective: mapPrimaryDirective(root.primary_directive),
    marketComparisons: arrayAt(root.market_comparisons, "$.market_comparisons").map(
      (item, index) => mapMarketComparison(item, `$.market_comparisons[${index}]`),
    ),
    weatherAlerts: arrayAt(root.weather_alerts, "$.weather_alerts").map(
      (item, index) => mapWeatherAlert(item, `$.weather_alerts[${index}]`),
    ),
    modelEvaluationSummary: mapEvaluationSummary(
      root.model_evaluation_summary,
      "$.model_evaluation_summary",
    ),
  };
}

export function mapMarketHistoryResponse(payload: unknown): MarketHistoryResponse {
  const root = objectAt(payload, "$");
  return {
    marketCode: stringAt(root.market_code, "$.market_code"),
    marketName: stringAt(root.market_name, "$.market_name"),
    cropCode: stringAt(root.crop_code, "$.crop_code"),
    days: numberAt(root.days, "$.days"),
    referenceDate: stringAt(root.reference_date, "$.reference_date"),
    forecastSource: enumAt(root.forecast_source, forecastSources, "$.forecast_source"),
    modelVersion: stringAt(root.model_version, "$.model_version"),
    history: arrayAt(root.history, "$.history").map((item, index) => {
      const point = objectAt(item, `$.history[${index}]`);
      return {
        date: stringAt(point.date, `$.history[${index}].date`),
        priceLkrPerKg: numberAt(
          point.price_lkr_per_kg,
          `$.history[${index}].price_lkr_per_kg`,
        ),
        arrivalVolumeTonnes: nullableNumberAt(
          point.arrival_volume_tonnes,
          `$.history[${index}].arrival_volume_tonnes`,
        ),
      };
    }),
    forecastTrajectory: arrayAt(
      root.forecast_trajectory,
      "$.forecast_trajectory",
    ).map((item, index) => {
      const point = objectAt(item, `$.forecast_trajectory[${index}]`);
      const horizon = numberAt(
        point.horizon_hours,
        `$.forecast_trajectory[${index}].horizon_hours`,
      );
      if (horizon !== 48 && horizon !== 72) {
        throw new ApiContractError(
          `$.forecast_trajectory[${index}].horizon_hours`,
          "48 or 72",
        );
      }
      return {
        horizonHours: horizon,
        predictedPriceLkr: numberAt(
          point.predicted_price_lkr,
          `$.forecast_trajectory[${index}].predicted_price_lkr`,
        ),
        baselineNaiveLkr: numberAt(
          point.baseline_naive_lkr,
          `$.forecast_trajectory[${index}].baseline_naive_lkr`,
        ),
        baselineMa7Lkr: numberAt(
          point.baseline_ma7_lkr,
          `$.forecast_trajectory[${index}].baseline_ma7_lkr`,
        ),
        direction: enumAt(
          point.direction,
          directions,
          `$.forecast_trajectory[${index}].direction`,
        ),
      };
    }),
  };
}

export function mapMetadataConfig(payload: unknown): MetadataConfig {
  const root = objectAt(payload, "$");
  const fuelPrices =
    root.fuel_prices === null
      ? null
      : objectAt(root.fuel_prices, "$.fuel_prices");
  const thresholds = objectAt(root.thresholds, "$.thresholds");
  return {
    origins: arrayAt(root.origins, "$.origins").map((item, index) => {
      const origin = objectAt(item, `$.origins[${index}]`);
      return {
        code: stringAt(origin.code, `$.origins[${index}].code`),
        name: stringAt(origin.name, `$.origins[${index}].name`),
        district: stringAt(origin.district, `$.origins[${index}].district`),
        province: stringAt(origin.province, `$.origins[${index}].province`),
        latitude: numberAt(origin.latitude, `$.origins[${index}].latitude`),
        longitude: numberAt(origin.longitude, `$.origins[${index}].longitude`),
        supplyZone: stringAt(
          origin.supply_zone,
          `$.origins[${index}].supply_zone`,
        ),
      };
    }),
    markets: arrayAt(root.markets, "$.markets").map((item, index) => {
      const market = objectAt(item, `$.markets[${index}]`);
      return {
        code: stringAt(market.code, `$.markets[${index}].code`),
        name: stringAt(market.name, `$.markets[${index}].name`),
        province: stringAt(market.province, `$.markets[${index}].province`),
        latitude: numberAt(market.latitude, `$.markets[${index}].latitude`),
        longitude: numberAt(market.longitude, `$.markets[${index}].longitude`),
        handlingFeePerKgLkr: numberAt(
          market.handling_fee_per_kg_lkr,
          `$.markets[${index}].handling_fee_per_kg_lkr`,
        ),
      };
    }),
    crops: arrayAt(root.crops, "$.crops").map((item, index) => {
      const crop = objectAt(item, `$.crops[${index}]`);
      return {
        code: stringAt(crop.code, `$.crops[${index}].code`),
        name: stringAt(crop.name, `$.crops[${index}].name`),
        spoilageRatePer100KmPct: numberAt(
          crop.spoilage_rate_per_100km_pct ?? crop.spoilage_rate_per100_km_pct,
          `$.crops[${index}].spoilage_rate_per_100km_pct`,
        ),
      };
    }),
    routes: arrayAt(root.routes, "$.routes").map((item, index) => {
      const route = objectAt(item, `$.routes[${index}]`);
      return {
        originCode: stringAt(
          route.origin_code,
          `$.routes[${index}].origin_code`,
        ),
        marketCode: stringAt(
          route.market_code,
          `$.routes[${index}].market_code`,
        ),
        distanceKm: numberAt(
          route.distance_km,
          `$.routes[${index}].distance_km`,
        ),
        terrainFactor: numberAt(
          route.terrain_factor,
          `$.routes[${index}].terrain_factor`,
        ),
      };
    }),
    vehicleTypes: arrayAt(root.vehicle_types, "$.vehicle_types").map(
      (item, index) => {
        const vehicle = objectAt(item, `$.vehicle_types[${index}]`);
        return {
          code: enumAt(
            vehicle.code,
            vehicleTypes,
            `$.vehicle_types[${index}].code`,
          ),
          displayName: stringAt(
            vehicle.display_name,
            `$.vehicle_types[${index}].display_name`,
          ),
          capacityKg: numberAt(
            vehicle.capacity_kg,
            `$.vehicle_types[${index}].capacity_kg`,
          ),
          litresPerKm: numberAt(
            vehicle.litres_per_km,
            `$.vehicle_types[${index}].litres_per_km`,
          ),
          fuelType: enumAt(
            vehicle.fuel_type,
            ["DIESEL", "PETROL"] as const,
            `$.vehicle_types[${index}].fuel_type`,
          ),
        };
      },
    ),
    horizons: arrayAt(root.horizons, "$.horizons").map((item, index) => {
      const horizon = numberAt(item, `$.horizons[${index}]`);
      if (horizon !== 48 && horizon !== 72) {
        throw new ApiContractError(`$.horizons[${index}]`, "48 or 72");
      }
      return horizon;
    }),
    fuelPrices:
      fuelPrices === null
        ? {
            effectiveDate: null,
            dieselLkrPerLiter: null,
            petrolLkrPerLiter: null,
          }
        : {
            effectiveDate: nullableStringAt(
              fuelPrices.effective_date,
              "$.fuel_prices.effective_date",
            ),
            dieselLkrPerLiter: nullableNumberAt(
              fuelPrices.diesel_lkr_per_liter,
              "$.fuel_prices.diesel_lkr_per_liter",
            ),
            petrolLkrPerLiter: nullableNumberAt(
              fuelPrices.petrol_lkr_per_liter,
              "$.fuel_prices.petrol_lkr_per_liter",
            ),
          },
    thresholds: {
      safeMarginPct: numberAt(
        thresholds.safe_margin_pct,
        "$.thresholds.safe_margin_pct",
      ),
      safeAbsoluteFloorLkr: numberAt(
        thresholds.safe_absolute_floor_lkr,
        "$.thresholds.safe_absolute_floor_lkr",
      ),
      movementThresholdPct: numberAt(
        thresholds.movement_threshold_pct,
        "$.thresholds.movement_threshold_pct",
      ),
    },
  };
}

export function mapDataStatus(payload: unknown): DataStatus {
  const root = objectAt(payload, "$");
  return {
    overallStatus: enumAt(
      root.overall_status,
      ["LIVE", "PARTIAL", "FALLBACK", "UNAVAILABLE"] as const,
      "$.overall_status",
    ),
    generatedAt: stringAt(root.generated_at, "$.generated_at"),
    sources: arrayAt(root.sources, "$.sources").map((item, index) => {
      const source = objectAt(item, `$.sources[${index}]`);
      return {
        sourceCode: stringAt(
          source.source_code,
          `$.sources[${index}].source_code`,
        ),
        label: stringAt(source.label, `$.sources[${index}].label`),
        dataState: enumAt(
          source.data_state,
          dataStates,
          `$.sources[${index}].data_state`,
        ),
        freshness: enumAt(
          source.freshness,
          freshnessStates,
          `$.sources[${index}].freshness`,
        ),
        lastAttemptAt: nullableStringAt(
          source.last_attempt_at,
          `$.sources[${index}].last_attempt_at`,
        ),
        lastSuccessAt: nullableStringAt(
          source.last_success_at,
          `$.sources[${index}].last_success_at`,
        ),
        latestObservationDate: nullableStringAt(
          source.latest_observation_date,
          `$.sources[${index}].latest_observation_date`,
        ),
        sourceUrl: nullableStringAt(
          source.source_url,
          `$.sources[${index}].source_url`,
        ),
        recordsWritten: numberAt(
          source.records_written,
          `$.sources[${index}].records_written`,
        ),
        message: nullableStringAt(
          source.message,
          `$.sources[${index}].message`,
        ),
      };
    }),
    priceCoverage: arrayAt(root.price_coverage, "$.price_coverage").map(
      (item, index) => {
        const coverage = objectAt(item, `$.price_coverage[${index}]`);
        return {
          marketCode: stringAt(
            coverage.market_code,
            `$.price_coverage[${index}].market_code`,
          ),
          cropCode: stringAt(
            coverage.crop_code,
            `$.price_coverage[${index}].crop_code`,
          ),
          latestObservationDate: nullableStringAt(
            coverage.latest_observation_date,
            `$.price_coverage[${index}].latest_observation_date`,
          ),
          source: nullableStringAt(
            coverage.source,
            `$.price_coverage[${index}].source`,
          ),
          state: enumAt(
            coverage.state,
            coverageStates,
            `$.price_coverage[${index}].state`,
          ),
        };
      },
    ),
  };
}

function mapPrimaryDirective(payload: unknown): AnalyzeResponse["primaryDirective"] {
  const directive = objectAt(payload, "$.primary_directive");
  return {
    severity: enumAt(
      directive.severity,
      ["CRITICAL_REROUTE", "PROCEED_DEFAULT", "HOLD_HARVEST"] as const,
      "$.primary_directive.severity",
    ),
    headline: stringAt(
      directive.headline,
      "$.primary_directive.headline",
    ),
    explanation: stringAt(
      directive.explanation,
      "$.primary_directive.explanation",
    ),
    defaultMarketCode: stringAt(
      directive.default_market_code,
      "$.primary_directive.default_market_code",
    ),
    recommendedMarketCode: nullableStringAt(
      directive.recommended_market_code,
      "$.primary_directive.recommended_market_code",
    ),
    profitDeltaLkr: nullableNumberAt(
      directive.profit_delta_lkr,
      "$.primary_directive.profit_delta_lkr",
    ),
    profitUpliftPct: nullableNumberAt(
      directive.profit_uplift_pct,
      "$.primary_directive.profit_uplift_pct",
    ),
  };
}

function mapMarketComparison(
  payload: unknown,
  path: string,
): MarketComparison {
  const market = objectAt(payload, path);
  return {
    marketCode: stringAt(market.market_code, `${path}.market_code`),
    marketName: stringAt(market.market_name, `${path}.market_name`),
    currentPriceLkr: numberAt(
      market.current_price_lkr,
      `${path}.current_price_lkr`,
    ),
    predictedPriceLkr: numberAt(
      market.predicted_price_lkr,
      `${path}.predicted_price_lkr`,
    ),
    pctChange: optionalNullableNumberAt(
      market.pct_change,
      `${path}.pct_change`,
    ),
    effectiveVolumeKg: optionalNullableNumberAt(
      market.effective_volume_kg,
      `${path}.effective_volume_kg`,
    ),
    grossRevenueLkr: numberAt(
      market.gross_revenue_lkr,
      `${path}.gross_revenue_lkr`,
    ),
    transportCostLkr: numberAt(
      market.transport_cost_lkr,
      `${path}.transport_cost_lkr`,
    ),
    spoilageLossLkr: numberAt(
      market.spoilage_loss_lkr,
      `${path}.spoilage_loss_lkr`,
    ),
    handlingCostLkr: numberAt(
      market.handling_cost_lkr,
      `${path}.handling_cost_lkr`,
    ),
    netProfitLkr: numberAt(market.net_profit_lkr, `${path}.net_profit_lkr`),
    distanceKm: numberAt(market.distance_km, `${path}.distance_km`),
    profitDeltaLkr: numberAt(
      market.profit_delta_lkr,
      `${path}.profit_delta_lkr`,
    ),
    profitUpliftPct: nullableNumberAt(
      market.profit_uplift_pct,
      `${path}.profit_uplift_pct`,
    ),
    fuelLitres: numberAt(market.fuel_litres, `${path}.fuel_litres`),
    trips: numberAt(market.trips, `${path}.trips`),
    vehicleCapacityKg: numberAt(
      market.vehicle_capacity_kg,
      `${path}.vehicle_capacity_kg`,
    ),
    recommended: booleanAt(market.is_recommended, `${path}.is_recommended`),
    direction: enumAt(market.direction, directions, `${path}.direction`),
    glutRiskLevel:
      market.glut_risk_level === undefined || market.glut_risk_level === null
        ? null
        : enumAt(
            market.glut_risk_level,
            riskLevels,
            `${path}.glut_risk_level`,
          ),
    confidenceScore: optionalNullableNumberAt(
      market.confidence_score,
      `${path}.confidence_score`,
    ),
    primaryDriver:
      market.primary_driver === undefined
        ? null
        : nullableStringAt(market.primary_driver, `${path}.primary_driver`),
  };
}

function mapWeatherAlert(
  payload: unknown,
  path: string,
): AnalyzeResponse["weatherAlerts"][number] {
  const alert = objectAt(payload, path);
  return {
    marketCode: stringAt(alert.market_code, `${path}.market_code`),
    riskLevel: enumAt(alert.risk_level, riskLevels, `${path}.risk_level`),
    message: stringAt(alert.message, `${path}.message`),
    precipitationMm: numberAt(
      alert.precipitation_mm,
      `${path}.precipitation_mm`,
    ),
    extremeWeather: booleanAt(
      alert.extreme_weather,
      `${path}.extreme_weather`,
    ),
    source: stringAt(alert.source, `${path}.source`),
    observationDate: stringAt(
      alert.observation_date,
      `${path}.observation_date`,
    ),
  };
}

function mapEvaluationSummary(
  payload: unknown,
  path: string,
): ModelEvaluationSummary {
  const summary = objectAt(payload, path);
  const available = booleanAt(summary.available, `${path}.available`);
  const metric = (key: string) => {
    const value = summary[key];
    return available ? numberAt(value, `${path}.${key}`) : nullableNumberAt(
      value,
      `${path}.${key}`,
    );
  };
  return {
    available,
    message: nullableStringAt(summary.message, `${path}.message`),
    modelDirectionalSymmetryPct: metric("model_directional_symmetry_pct"),
    modelMaeLkr: metric("model_mae_lkr"),
    modelSafeMarginFpr: mapSafeMarginFpr(
      summary.model_safe_margin_fpr,
      `${path}.model_safe_margin_fpr`,
    ),
    naiveDirectionalSymmetryPct: metric("naive_directional_symmetry_pct"),
    naiveMaeLkr: metric("naive_mae_lkr"),
    naiveSafeMarginFpr: mapSafeMarginFpr(
      summary.naive_safe_margin_fpr,
      `${path}.naive_safe_margin_fpr`,
    ),
    ma7DirectionalSymmetryPct: metric("ma7_directional_symmetry_pct"),
    ma7MaeLkr: metric("ma7_mae_lkr"),
    ma7SafeMarginFpr: mapSafeMarginFpr(
      summary.ma7_safe_margin_fpr,
      `${path}.ma7_safe_margin_fpr`,
    ),
  };
}

function mapSafeMarginFpr(payload: unknown, path: string): SafeMarginFpr | null {
  if (payload === null) return null;
  const value = objectAt(payload, path);
  return {
    safeMarginFprPct: nullableNumberAt(
      value.safe_margin_fpr_pct,
      `${path}.safe_margin_fpr_pct`,
    ),
    rerouteCount: numberAt(value.reroute_count, `${path}.reroute_count`),
    falseRerouteCount: numberAt(
      value.false_reroute_count,
      `${path}.false_reroute_count`,
    ),
  };
}

function objectAt(value: unknown, path: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiContractError(path, "an object");
  }
  return value as JsonObject;
}

function arrayAt(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ApiContractError(path, "an array");
  }
  return value;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new ApiContractError(path, "a string");
  }
  return value;
}

function nullableStringAt(value: unknown, path: string): string | null {
  return value === null ? null : stringAt(value, path);
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiContractError(path, "a finite number");
  }
  return value;
}

function nullableNumberAt(value: unknown, path: string): number | null {
  return value === null ? null : numberAt(value, path);
}

function optionalNullableNumberAt(value: unknown, path: string): number | null {
  return value === undefined || value === null ? null : numberAt(value, path);
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new ApiContractError(path, "a boolean");
  }
  return value;
}

function enumAt<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
): T[number] {
  const candidate = stringAt(value, path);
  if (!allowed.includes(candidate as T[number])) {
    throw new ApiContractError(path, allowed.join(", "));
  }
  return candidate as T[number];
}

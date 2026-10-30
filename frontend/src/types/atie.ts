export type DirectiveSeverity =
  | "CRITICAL_REROUTE"
  | "PROCEED_DEFAULT"
  | "HOLD_HARVEST";

export type ForecastSource = "MODEL" | "FALLBACK" | "DEMO_FIXTURE";

export type InputDataState = "LIVE" | "CACHED" | "SEED";

export type AnalysisState =
  | { kind: "demo"; message: string }
  | { kind: "live" };

export interface MarketComparison {
  marketCode: string;
  marketName: string;
  currentPriceLkr: number;
  predictedPriceLkr: number;
  grossRevenueLkr: number;
  transportCostLkr: number;
  spoilageLossLkr: number;
  handlingCostLkr: number;
  netProfitLkr: number;
  distanceKm: number;
  profitDeltaLkr: number;
  profitUpliftPct: number | null;
  fuelLitres: number;
  trips: number;
  vehicleCapacityKg: number;
  recommended: boolean;
  direction: "CRASH" | "STABLE" | "SURGE";
}

export interface PrimaryDirective {
  severity: DirectiveSeverity;
  headline: string;
  explanation: string;
  defaultMarketCode: string;
  recommendedMarketCode: string | null;
  profitDeltaLkr: number | null;
  profitUpliftPct: number | null;
}

export interface WeatherAlert {
  marketCode: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  precipitationMm: number;
  extremeWeather: boolean;
  source: string;
  observationDate: string;
}

export interface ModelEvaluationSummary {
  available: boolean;
  message: string | null;
  modelDirectionalSymmetryPct: number | null;
  modelMaeLkr: number | null;
  modelSafeMarginFpr: SafeMarginFpr | null;
  naiveDirectionalSymmetryPct: number | null;
  naiveMaeLkr: number | null;
  naiveSafeMarginFpr: SafeMarginFpr | null;
  ma7DirectionalSymmetryPct: number | null;
  ma7MaeLkr: number | null;
  ma7SafeMarginFpr: SafeMarginFpr | null;
}

export interface SafeMarginFpr {
  safeMarginFprPct: number | null;
  rerouteCount: number;
  falseRerouteCount: number;
}

export interface AnalyzeResponse {
  forecastSource: ForecastSource;
  inputDataState: InputDataState;
  modelVersion: string;
  referenceDate: string;
  analysisState?: AnalysisState;
  primaryDirective: PrimaryDirective;
  marketComparisons: MarketComparison[];
  weatherAlerts: WeatherAlert[];
  modelEvaluationSummary: ModelEvaluationSummary;
}

export interface MarketHistoryPoint {
  date: string;
  priceLkrPerKg: number;
  arrivalVolumeTonnes: number | null;
}

export interface ForecastTrajectoryPoint {
  horizonHours: 48 | 72;
  predictedPriceLkr: number;
  baselineNaiveLkr: number;
  baselineMa7Lkr: number;
  direction: "CRASH" | "STABLE" | "SURGE";
}

export interface MarketHistoryResponse {
  marketCode: string;
  marketName: string;
  cropCode: string;
  days: number;
  referenceDate: string;
  forecastSource: ForecastSource;
  modelVersion: string;
  history: MarketHistoryPoint[];
  forecastTrajectory: ForecastTrajectoryPoint[];
}

export interface MetadataOrigin {
  code: string;
  name: string;
  district: string;
  province: string;
  latitude: number;
  longitude: number;
  supplyZone: string;
}

export interface MetadataMarket {
  code: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  handlingFeePerKgLkr: number;
}

export interface MetadataCrop {
  code: string;
  name: string;
  spoilageRatePer100KmPct: number;
}

export interface MetadataVehicle {
  code: AnalyzeRequest["vehicleType"];
  displayName: string;
  capacityKg: number;
  litresPerKm: number;
  fuelType: "DIESEL" | "PETROL";
}

export interface MetadataRoute {
  originCode: string;
  marketCode: string;
  distanceKm: number;
  terrainFactor: number;
}

export interface MetadataConfig {
  origins: MetadataOrigin[];
  markets: MetadataMarket[];
  crops: MetadataCrop[];
  routes: MetadataRoute[];
  vehicleTypes: MetadataVehicle[];
  horizons: Array<48 | 72>;
  fuelPrices: {
    effectiveDate: string | null;
    dieselLkrPerLiter: number | null;
    petrolLkrPerLiter: number | null;
  };
  thresholds: {
    safeMarginPct: number;
    safeAbsoluteFloorLkr: number;
    movementThresholdPct: number;
  };
}

export interface DataSourceStatus {
  sourceCode: string;
  label: string;
  dataState: "LIVE" | "CACHED" | "SEED" | "UNAVAILABLE";
  freshness: "CURRENT" | "STALE" | "UNKNOWN";
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  latestObservationDate: string | null;
  sourceUrl: string | null;
  recordsWritten: number;
  message: string | null;
}

export interface PriceCoverage {
  marketCode: string;
  cropCode: string;
  latestObservationDate: string | null;
  source: string | null;
  state: "CURRENT" | "STALE" | "SEED" | "CACHED" | "UNAVAILABLE" | "UNKNOWN";
}

export interface DataStatus {
  overallStatus: "LIVE" | "PARTIAL" | "FALLBACK" | "UNAVAILABLE";
  generatedAt: string;
  sources: DataSourceStatus[];
  priceCoverage: PriceCoverage[];
}

export interface AnalyzeRequest {
  originCode: string;
  defaultMarketCode: string;
  cropCode: string;
  quantityKg: number;
  vehicleType: "THREE_WHEELER" | "MINI_TRUCK_BATTA" | "LORRY_3_5T";
  horizonHours: 48 | 72;
  demoMode: boolean;
}

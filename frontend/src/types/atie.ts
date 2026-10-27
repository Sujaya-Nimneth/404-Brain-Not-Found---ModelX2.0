export type DirectiveSeverity =
  | "CRITICAL_REROUTE"
  | "PROCEED_DEFAULT"
  | "HOLD_HARVEST";

export type ForecastSource = "MODEL" | "FALLBACK" | "DEMO_FIXTURE";

export type AnalysisState =
  | { kind: "demo"; message: string }
  | { kind: "live" }
  | { kind: "offline"; message: string };

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
  profitUpliftPct: number | null;
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
}

export interface ModelEvaluationSummary {
  modelDirectionalSymmetryPct: number;
  modelMaeLkr: number;
  modelSafeMarginFpr: SafeMarginFpr | null;
  naiveDirectionalSymmetryPct: number;
  naiveMaeLkr: number;
  naiveSafeMarginFpr: SafeMarginFpr | null;
  ma7DirectionalSymmetryPct: number;
  ma7MaeLkr: number;
  ma7SafeMarginFpr: SafeMarginFpr | null;
}

export interface SafeMarginFpr {
  safeMarginFprPct: number | null;
  rerouteCount: number;
  falseRerouteCount: number;
}

export interface AnalyzeResponse {
  forecastSource: ForecastSource;
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
    effectiveDate?: string;
    dieselLkrPerLiter?: number;
    petrolLkrPerLiter?: number;
  };
  thresholds: {
    safeMarginPct: number;
    safeAbsoluteFloorLkr: number;
    movementThresholdPct: number;
  };
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

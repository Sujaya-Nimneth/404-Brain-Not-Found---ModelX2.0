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

export interface AnalyzeRequest {
  originCode: string;
  defaultMarketCode: string;
  cropCode: string;
  quantityKg: number;
  vehicleType: "THREE_WHEELER" | "MINI_TRUCK_BATTA" | "LORRY_3_5T";
  horizonHours: 48 | 72;
  demoMode: boolean;
}

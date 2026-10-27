export type DirectiveSeverity =
  | "CRITICAL_REROUTE"
  | "PROCEED_DEFAULT"
  | "HOLD_HARVEST";

export type ForecastSource = "MODEL" | "FALLBACK" | "DEMO_FIXTURE";

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
  naiveDirectionalSymmetryPct: number;
  naiveMaeLkr: number;
  ma7DirectionalSymmetryPct: number;
  ma7MaeLkr: number;
  safeMarginFprPct: number | null;
}

export interface AnalyzeResponse {
  forecastSource: ForecastSource;
  modelVersion: string;
  referenceDate: string;
  primaryDirective: PrimaryDirective;
  marketComparisons: MarketComparison[];
  weatherAlerts: WeatherAlert[];
  modelEvaluationSummary: ModelEvaluationSummary;
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

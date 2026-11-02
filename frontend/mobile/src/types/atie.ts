export type {
  AnalysisState,
  AnalyzeRequest,
  AnalyzeResponse,
  DataSourceStatus,
  DataStatus,
  DirectiveSeverity,
  ForecastSource,
  ForecastTrajectoryPoint,
  InputDataState,
  MarketComparison,
  MarketHistoryPoint,
  MarketHistoryResponse,
  MetadataConfig,
  MetadataCrop,
  MetadataMarket,
  MetadataOrigin,
  MetadataRoute,
  MetadataVehicle,
  ModelEvaluationSummary,
  PriceCoverage,
  PrimaryDirective,
  SafeMarginFpr,
  WeatherAlert,
} from "../../../src/types/atie";

import type { AnalyzeRequest, AnalyzeResponse } from "../../../src/types/atie";

export type LanguageCode = "en" | "si" | "ta";

export type MobileTab = "directive" | "markets" | "forecast" | "trust";

export interface CachedResultSnapshot {
  request: AnalyzeRequest;
  response: AnalyzeResponse;
  cachedAt: string;
}

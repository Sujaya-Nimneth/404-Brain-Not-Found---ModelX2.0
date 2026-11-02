import {
  localizeCropName,
  localizePlaceName,
  localizeSeverity,
  localizeVehicleName,
} from "../i18n/translations";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  LanguageCode,
} from "../types/atie";
import {
  formatCurrency,
  formatLkr,
  formatSignedCurrency,
  formatSignedPct,
} from "./format";

export function buildDispatchMessage(
  request: AnalyzeRequest,
  response: AnalyzeResponse,
  lang: LanguageCode = "en",
): string {
  const directive = response.primaryDirective;
  const crop = localizeCropName(request.cropCode, request.cropCode, lang);
  const origin = localizePlaceName(request.originCode, request.originCode, lang);
  const defaultMarketName = localizePlaceName(
    directive.defaultMarketCode,
    directive.defaultMarketCode,
    lang,
  );
  const recommendedCode =
    directive.recommendedMarketCode ?? directive.defaultMarketCode;
  const targetMarket = response.marketComparisons.find(
    (m) => m.marketCode === recommendedCode,
  );
  const targetMarketName = localizePlaceName(
    recommendedCode,
    targetMarket?.marketName ?? recommendedCode,
    lang,
  );
  const vehicle = localizeVehicleName(
    request.vehicleType,
    request.vehicleType,
    lang,
  );
  const severity = localizeSeverity(directive.severity, lang);
  const sourceLabel = `${response.forecastSource.replace(/_/g, " ")} · ${response.inputDataState}`;

  const lines: string[] = [
    `🌿 *ATIE Dispatch (${severity})*`,
    `${formatLkr(request.quantityKg)} kg ${crop} · ${origin} (${vehicle}, ${request.horizonHours}h)`,
    `▶ ${directive.headline}`,
  ];

  if (targetMarket) {
    lines.push(
      `📍 ${targetMarketName}: ${formatCurrency(targetMarket.netProfitLkr)} net (${targetMarket.predictedPriceLkr.toFixed(2)} LKR/kg)`,
    );
    lines.push(
      `🚛 ${targetMarket.distanceKm} km one-way · ${targetMarket.trips} trip(s) · ${targetMarket.fuelLitres.toFixed(1)} L fuel (${formatCurrency(targetMarket.transportCostLkr)})`,
    );
  }

  if (
    directive.severity === "CRITICAL_REROUTE" &&
    directive.profitDeltaLkr !== null
  ) {
    lines.push(
      `💰 Gain vs ${defaultMarketName}: ${formatSignedCurrency(directive.profitDeltaLkr)} (${formatSignedPct(directive.profitUpliftPct)})`,
    );
  }

  lines.push(`🔎 Source: [${sourceLabel}] · Ref ${response.referenceDate}`);
  return lines.join("\n");
}

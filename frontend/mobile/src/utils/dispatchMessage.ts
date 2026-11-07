import {
  localizeCropName,
  localizeDirectiveCopy,
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
  formatInteger,
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
  const defaultMarket = response.marketComparisons.find(
    (m) => m.marketCode === directive.defaultMarketCode,
  );
  const defaultMarketName = localizePlaceName(
    directive.defaultMarketCode,
    defaultMarket?.marketName ?? directive.defaultMarketCode,
    lang,
  );
  const recommendedMarket = directive.recommendedMarketCode
    ? response.marketComparisons.find(
        (m) => m.marketCode === directive.recommendedMarketCode,
      )
    : undefined;
  const vehicle = localizeVehicleName(
    request.vehicleType,
    request.vehicleType,
    lang,
  );
  const severity = localizeSeverity(directive.severity, lang);
  const localizedCopy = localizeDirectiveCopy(response, lang);
  const sourceLabel = `${response.forecastSource.replace(/_/g, " ")} · ${response.inputDataState}`;

  const lines: string[] = [
    `🌿 *ATIE Dispatch (${severity})*`,
    `${formatInteger(request.quantityKg)} kg ${crop} · ${origin} (${vehicle}, ${request.horizonHours}h)`,
    `▶ ${localizedCopy.headline}`,
  ];

  if (directive.severity === "HOLD_HARVEST") {
    if (lang === "si") {
      lines.push(
        `⛔ *අස්වැන්න පිටත් නොකරන්න (HOLD HARVEST)* — ප්‍රවාහන සහ නරක්වීම් වියදම් හේතුවෙන් ආරක්ෂිත ශුද්ධ ලාභයක් නොමැත.`,
      );
      if (defaultMarket) {
        lines.push(
          `⚠️ ${defaultMarketName} ඇස්තමේන්තුව: ${formatCurrency(defaultMarket.netProfitLkr)} ශුද්ධ (${defaultMarket.predictedPriceLkr.toFixed(2)} LKR/kg)`,
        );
      }
    } else if (lang === "ta") {
      lines.push(
        `⛔ *வாகனத்தை அனுப்ப வேண்டாம் (HOLD HARVEST)* — போக்குவரத்து மற்றும் வீணாகும் செலவுகளால் பாதுகாப்பான நிகர இலாபம் இல்லை.`,
      );
      if (defaultMarket) {
        lines.push(
          `⚠️ ${defaultMarketName} மதிப்பீடு: ${formatCurrency(defaultMarket.netProfitLkr)} நிகர (${defaultMarket.predictedPriceLkr.toFixed(2)} LKR/kg)`,
        );
      }
    } else {
      lines.push(
        `⛔ *DO NOT DISPATCH — HOLD HARVEST*: Reachable markets do not clear a safe positive net return after transport and spoilage.`,
      );
      if (defaultMarket) {
        lines.push(
          `⚠️ ${defaultMarketName} estimate: ${formatCurrency(defaultMarket.netProfitLkr)} net (${defaultMarket.predictedPriceLkr.toFixed(2)} LKR/kg)`,
        );
      }
    }
  } else {
    const dispatchTarget = recommendedMarket ?? defaultMarket;
    if (dispatchTarget) {
      const targetMarketName = localizePlaceName(
        dispatchTarget.marketCode,
        dispatchTarget.marketName,
        lang,
      );
      if (lang === "si") {
        lines.push(
          `📍 ${targetMarketName}: ${formatCurrency(dispatchTarget.netProfitLkr)} ශුද්ධ ලාභය (${dispatchTarget.predictedPriceLkr.toFixed(2)} LKR/kg)`,
        );
        lines.push(
          `🚛 එක් දිශාවකට ${dispatchTarget.distanceKm} km · ගමන් ${dispatchTarget.trips} · ඉන්ධන ${dispatchTarget.fuelLitres.toFixed(1)} L (${formatCurrency(dispatchTarget.transportCostLkr)})`,
        );
      } else if (lang === "ta") {
        lines.push(
          `📍 ${targetMarketName}: ${formatCurrency(dispatchTarget.netProfitLkr)} நிகர இலாபம் (${dispatchTarget.predictedPriceLkr.toFixed(2)} LKR/kg)`,
        );
        lines.push(
          `🚛 ஒரு வழி ${dispatchTarget.distanceKm} km · பயணம் ${dispatchTarget.trips} · எரிபொருள் ${dispatchTarget.fuelLitres.toFixed(1)} L (${formatCurrency(dispatchTarget.transportCostLkr)})`,
        );
      } else {
        lines.push(
          `📍 ${targetMarketName}: ${formatCurrency(dispatchTarget.netProfitLkr)} net (${dispatchTarget.predictedPriceLkr.toFixed(2)} LKR/kg)`,
        );
        lines.push(
          `🚛 ${dispatchTarget.distanceKm} km one-way · ${dispatchTarget.trips} trip(s) · ${dispatchTarget.fuelLitres.toFixed(1)} L fuel (${formatCurrency(dispatchTarget.transportCostLkr)})`,
        );
      }
    }

    if (
      directive.severity === "CRITICAL_REROUTE" &&
      directive.profitDeltaLkr !== null
    ) {
      if (lang === "si") {
        lines.push(
          `💰 ${defaultMarketName} ට වඩා අමතර ලාභය: ${formatSignedCurrency(directive.profitDeltaLkr)} (${formatSignedPct(directive.profitUpliftPct)})`,
        );
      } else if (lang === "ta") {
        lines.push(
          `💰 ${defaultMarketName} உடன் ஒப்பிடும்போது கூடுதல் இலாபம்: ${formatSignedCurrency(directive.profitDeltaLkr)} (${formatSignedPct(directive.profitUpliftPct)})`,
        );
      } else {
        lines.push(
          `💰 Gain vs ${defaultMarketName}: ${formatSignedCurrency(directive.profitDeltaLkr)} (${formatSignedPct(directive.profitUpliftPct)})`,
        );
      }
    }
  }

  lines.push(`🔎 Source: [${sourceLabel}] · Ref ${response.referenceDate}`);
  return lines.join("\n");
}

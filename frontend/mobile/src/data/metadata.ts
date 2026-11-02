import {
  demoRequest,
  demoResponse,
} from "../../../src/data/demoResponse";
import type {
  AnalyzeRequest,
  MarketHistoryResponse,
  MetadataConfig,
  MetadataMarket,
} from "../types/atie";

export { demoRequest, demoResponse };
export const defaultDemoRequest = demoRequest;
export const verifiedDemoResponse = demoResponse;

export const CANONICAL_QUANTITY_PRESETS_KG = [300, 1000, 1500, 3500] as const;

export const fallbackMetadataConfig: MetadataConfig = {
  origins: [
    {
      code: "ANURADHAPURA",
      name: "Anuradhapura",
      district: "Anuradhapura",
      province: "North Central",
      latitude: 8.3114,
      longitude: 80.4037,
      supplyZone: "NORTHERN",
    },
    {
      code: "JAFFNA",
      name: "Jaffna",
      district: "Jaffna",
      province: "Northern",
      latitude: 9.6615,
      longitude: 80.0255,
      supplyZone: "NORTHERN",
    },
    {
      code: "DAMBULLA",
      name: "Dambulla",
      district: "Matale",
      province: "Central",
      latitude: 7.8675,
      longitude: 80.6517,
      supplyZone: "CENTRAL",
    },
    {
      code: "NUWARA_ELIYA",
      name: "Nuwara Eliya",
      district: "Nuwara Eliya",
      province: "Central",
      latitude: 6.9497,
      longitude: 80.7891,
      supplyZone: "UPCOUNTRY",
    },
    {
      code: "THAMBUTTEGAMA",
      name: "Thambuttegama",
      district: "Anuradhapura",
      province: "North Central",
      latitude: 8.15,
      longitude: 80.44,
      supplyZone: "NORTH_CENTRAL",
    },
  ],
  markets: [
    {
      code: "DAMBULLA",
      name: "Dambulla Dedicated Economic Centre",
      province: "Central",
      latitude: 7.8675,
      longitude: 80.6517,
      handlingFeePerKgLkr: 2.5,
    },
    {
      code: "PETTAH_COLOMBO",
      name: "Colombo Pettah Wholesale Market",
      province: "Western",
      latitude: 6.9355,
      longitude: 79.8575,
      handlingFeePerKgLkr: 2.5,
    },
    {
      code: "NUWARA_ELIYA",
      name: "Nuwara Eliya Market",
      province: "Central",
      latitude: 6.9497,
      longitude: 80.7891,
      handlingFeePerKgLkr: 2.5,
    },
    {
      code: "KEPPETIPOLA",
      name: "Keppetipola Market",
      province: "Uva",
      latitude: 6.87,
      longitude: 80.93,
      handlingFeePerKgLkr: 2.5,
    },
    {
      code: "MEEGODA",
      name: "Meegoda Economic Centre",
      province: "Western",
      latitude: 6.84,
      longitude: 80.03,
      handlingFeePerKgLkr: 2.5,
    },
    {
      code: "THAMBUTTEGAMA",
      name: "Thambuttegama Economic Centre",
      province: "North Central",
      latitude: 8.15,
      longitude: 80.44,
      handlingFeePerKgLkr: 2.5,
    },
    {
      code: "JAFFNA",
      name: "Jaffna Market",
      province: "Northern",
      latitude: 9.6615,
      longitude: 80.0255,
      handlingFeePerKgLkr: 2.5,
    },
  ],
  crops: [
    { code: "TOMATO", name: "Tomato", spoilageRatePer100KmPct: 1.5 },
    { code: "CARROT", name: "Carrot", spoilageRatePer100KmPct: 0.75 },
    { code: "GREEN_CHILI", name: "Green Chili", spoilageRatePer100KmPct: 1.2 },
    { code: "RED_ONION", name: "Red Onion", spoilageRatePer100KmPct: 0.5 },
  ],
  vehicleTypes: [
    {
      code: "THREE_WHEELER",
      displayName: "Three-Wheeler",
      capacityKg: 300,
      litresPerKm: 0.04,
      fuelType: "PETROL",
    },
    {
      code: "MINI_TRUCK_BATTA",
      displayName: "Batta Mini-Truck",
      capacityKg: 1500,
      litresPerKm: 0.08,
      fuelType: "DIESEL",
    },
    {
      code: "LORRY_3_5T",
      displayName: "3.5 Tonne Lorry",
      capacityKg: 3500,
      litresPerKm: 0.14,
      fuelType: "DIESEL",
    },
  ],
  routes: [
    { originCode: "ANURADHAPURA", marketCode: "DAMBULLA", distanceKm: 70, terrainFactor: 1.0 },
    { originCode: "ANURADHAPURA", marketCode: "PETTAH_COLOMBO", distanceKm: 205, terrainFactor: 1.0 },
    { originCode: "ANURADHAPURA", marketCode: "NUWARA_ELIYA", distanceKm: 185, terrainFactor: 1.25 },
    { originCode: "ANURADHAPURA", marketCode: "KEPPETIPOLA", distanceKm: 175, terrainFactor: 1.25 },
    { originCode: "ANURADHAPURA", marketCode: "MEEGODA", distanceKm: 195, terrainFactor: 1.0 },
    { originCode: "ANURADHAPURA", marketCode: "THAMBUTTEGAMA", distanceKm: 55, terrainFactor: 1.0 },
    { originCode: "ANURADHAPURA", marketCode: "JAFFNA", distanceKm: 260, terrainFactor: 1.0 },

    { originCode: "JAFFNA", marketCode: "DAMBULLA", distanceKm: 330, terrainFactor: 1.0 },
    { originCode: "JAFFNA", marketCode: "PETTAH_COLOMBO", distanceKm: 400, terrainFactor: 1.0 },
    { originCode: "JAFFNA", marketCode: "NUWARA_ELIYA", distanceKm: 445, terrainFactor: 1.25 },
    { originCode: "JAFFNA", marketCode: "KEPPETIPOLA", distanceKm: 435, terrainFactor: 1.25 },
    { originCode: "JAFFNA", marketCode: "MEEGODA", distanceKm: 390, terrainFactor: 1.0 },
    { originCode: "JAFFNA", marketCode: "THAMBUTTEGAMA", distanceKm: 275, terrainFactor: 1.0 },
    { originCode: "JAFFNA", marketCode: "JAFFNA", distanceKm: 5, terrainFactor: 1.0 },

    { originCode: "DAMBULLA", marketCode: "DAMBULLA", distanceKm: 3, terrainFactor: 1.0 },
    { originCode: "DAMBULLA", marketCode: "PETTAH_COLOMBO", distanceKm: 150, terrainFactor: 1.0 },
    { originCode: "DAMBULLA", marketCode: "NUWARA_ELIYA", distanceKm: 120, terrainFactor: 1.25 },
    { originCode: "DAMBULLA", marketCode: "KEPPETIPOLA", distanceKm: 125, terrainFactor: 1.25 },
    { originCode: "DAMBULLA", marketCode: "MEEGODA", distanceKm: 140, terrainFactor: 1.0 },
    { originCode: "DAMBULLA", marketCode: "THAMBUTTEGAMA", distanceKm: 75, terrainFactor: 1.0 },
    { originCode: "DAMBULLA", marketCode: "JAFFNA", distanceKm: 330, terrainFactor: 1.0 },

    { originCode: "NUWARA_ELIYA", marketCode: "DAMBULLA", distanceKm: 120, terrainFactor: 1.25 },
    { originCode: "NUWARA_ELIYA", marketCode: "PETTAH_COLOMBO", distanceKm: 180, terrainFactor: 1.25 },
    { originCode: "NUWARA_ELIYA", marketCode: "NUWARA_ELIYA", distanceKm: 3, terrainFactor: 1.25 },
    { originCode: "NUWARA_ELIYA", marketCode: "KEPPETIPOLA", distanceKm: 55, terrainFactor: 1.25 },
    { originCode: "NUWARA_ELIYA", marketCode: "MEEGODA", distanceKm: 170, terrainFactor: 1.25 },
    { originCode: "NUWARA_ELIYA", marketCode: "THAMBUTTEGAMA", distanceKm: 185, terrainFactor: 1.25 },
    { originCode: "NUWARA_ELIYA", marketCode: "JAFFNA", distanceKm: 445, terrainFactor: 1.25 },

    { originCode: "THAMBUTTEGAMA", marketCode: "DAMBULLA", distanceKm: 75, terrainFactor: 1.0 },
    { originCode: "THAMBUTTEGAMA", marketCode: "PETTAH_COLOMBO", distanceKm: 190, terrainFactor: 1.0 },
    { originCode: "THAMBUTTEGAMA", marketCode: "NUWARA_ELIYA", distanceKm: 185, terrainFactor: 1.25 },
    { originCode: "THAMBUTTEGAMA", marketCode: "KEPPETIPOLA", distanceKm: 180, terrainFactor: 1.25 },
    { originCode: "THAMBUTTEGAMA", marketCode: "MEEGODA", distanceKm: 175, terrainFactor: 1.0 },
    { originCode: "THAMBUTTEGAMA", marketCode: "THAMBUTTEGAMA", distanceKm: 3, terrainFactor: 1.0 },
    { originCode: "THAMBUTTEGAMA", marketCode: "JAFFNA", distanceKm: 275, terrainFactor: 1.0 },
  ],
  horizons: [48, 72],
  fuelPrices: {
    effectiveDate: "2026-04-01",
    dieselLkrPerLiter: 283.0,
    petrolLkrPerLiter: 311.0,
  },
  thresholds: {
    safeMarginPct: 5.0,
    safeAbsoluteFloorLkr: 1000.0,
    movementThresholdPct: 10.0,
  },
};

export function filterReachableMarkets(
  config: MetadataConfig,
  originCode: string,
): MetadataMarket[] {
  const allowed = new Set(
    config.routes
      .filter((route) => route.originCode === originCode)
      .map((route) => route.marketCode),
  );
  if (allowed.size === 0) {
    return config.markets;
  }
  return config.markets.filter((market) => allowed.has(market.code));
}

export function resolveValidOriginSelection(
  config: MetadataConfig,
  current: AnalyzeRequest,
  nextOriginCode: string,
): AnalyzeRequest {
  const reachable = filterReachableMarkets(config, nextOriginCode);
  const keepDefault = reachable.some(
    (market) => market.code === current.defaultMarketCode,
  );
  return {
    ...current,
    originCode: nextOriginCode,
    defaultMarketCode: keepDefault
      ? current.defaultMarketCode
      : (reachable[0]?.code ?? current.defaultMarketCode),
  };
}

/**
 * Deterministic canonical fixture trajectories ONLY used when
 * demoMode === true and the backend history endpoint is unreachable offline.
 * Never returned for live (demoMode === false) requests.
 */
export function getOfflineDemoHistory(
  marketCode: string,
  cropCode: string,
): MarketHistoryResponse | null {
  if (cropCode !== "TOMATO") return null;

  const fixtures: Record<
    string,
    {
      name: string;
      series: number[];
      pred48: number;
      pred72: number;
      ma7: number;
      dir48: "CRASH" | "STABLE" | "SURGE";
      dir72: "CRASH" | "STABLE" | "SURGE";
    }
  > = {
    DAMBULLA: {
      name: "Dambulla",
      series: [212, 214, 210, 215, 218, 216, 214, 211, 213, 215, 214, 216, 218, 220],
      pred48: 154.0,
      pred72: 149.5,
      ma7: 215.29,
      dir48: "CRASH",
      dir72: "CRASH",
    },
    PETTAH_COLOMBO: {
      name: "Colombo Pettah",
      series: [164, 165, 166, 168, 167, 169, 168, 166, 167, 168, 169, 168, 169, 170],
      pred48: 187.5,
      pred72: 191.0,
      ma7: 168.14,
      dir48: "SURGE",
      dir72: "SURGE",
    },
    MEEGODA: {
      name: "Meegoda",
      series: [182, 181, 183, 180, 179, 181, 180, 181, 180, 179, 181, 180, 179, 180],
      pred48: 172.0,
      pred72: 170.5,
      ma7: 180.0,
      dir48: "STABLE",
      dir72: "STABLE",
    },
    KEPPETIPOLA: {
      name: "Keppetipola",
      series: [176, 175, 177, 174, 176, 175, 174, 175, 176, 174, 175, 176, 174, 175],
      pred48: 165.0,
      pred72: 163.5,
      ma7: 175.0,
      dir48: "STABLE",
      dir72: "STABLE",
    },
  };

  const entry = fixtures[marketCode];
  if (!entry) return null;

  const baseDate = new Date("2026-10-14T00:00:00Z");
  const history = entry.series.map((price, idx) => {
    const d = new Date(baseDate.getTime() + idx * 86_400_000);
    return {
      date: d.toISOString().slice(0, 10),
      priceLkrPerKg: price,
      arrivalVolumeTonnes: null,
    };
  });
  const current = entry.series[entry.series.length - 1];

  return {
    marketCode,
    marketName: entry.name,
    cropCode: "TOMATO",
    days: 14,
    referenceDate: "2026-10-27",
    forecastSource: "DEMO_FIXTURE",
    modelVersion: "demo-fixture-v1.0",
    history,
    forecastTrajectory: [
      {
        horizonHours: 48,
        predictedPriceLkr: entry.pred48,
        baselineNaiveLkr: current,
        baselineMa7Lkr: entry.ma7,
        direction: entry.dir48,
      },
      {
        horizonHours: 72,
        predictedPriceLkr: entry.pred72,
        baselineNaiveLkr: current,
        baselineMa7Lkr: entry.ma7,
        direction: entry.dir72,
      },
    ],
  };
}

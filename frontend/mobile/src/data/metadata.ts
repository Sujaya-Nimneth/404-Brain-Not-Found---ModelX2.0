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
    effectiveDate: "2026-10-01",
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
 * Exact seeded 14-day TOMATO series (db/seed.sql 2026-10-14..2026-10-27) paired
 * with the canonical DEMO_FIXTURE 48h & 72h trajectories from predictor.py.
 * ONLY used when demoMode === true and the backend history endpoint is offline.
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
      arrivals: number[];
      naive: number;
      pred48: number;
      pred72: number;
      ma7: number;
      dir48: "CRASH" | "STABLE" | "SURGE";
      dir72: "CRASH" | "STABLE" | "SURGE";
    }
  > = {
    DAMBULLA: {
      name: "Dambulla Dedicated Economic Centre",
      series: [205.62, 205.4, 204.91, 204.21, 203.36, 202.42, 201.5, 200.66, 200.01, 199.89, 201.42, 205.96, 213.37, 208.58],
      arrivals: [53.56, 52.99, 52.07, 50.88, 49.49, 48.0, 46.51, 45.13, 44.09, 44.75, 52.27, 74.16, 105.7, 122.21],
      naive: 220.0,
      pred48: 154.0,
      pred72: 155.0,
      ma7: 237.76,
      dir48: "CRASH",
      dir72: "CRASH",
    },
    PETTAH_COLOMBO: {
      name: "Colombo Pettah Wholesale Market",
      series: [170.41, 178.83, 180.13, 179.56, 178.84, 179.84, 180.73, 179.39, 177.74, 177.71, 177.04, 175.59, 175.31, 180.18],
      arrivals: [88.29, 85.28, 82.72, 80.53, 78.85, 77.8, 77.44, 77.76, 78.44, 78.15, 74.05, 64.15, 52.43, 48.49],
      naive: 170.0,
      pred48: 187.5,
      pred72: 188.5,
      ma7: 171.2,
      dir48: "SURGE",
      dir72: "SURGE",
    },
    KEPPETIPOLA: {
      name: "Keppetipola Market",
      series: [187.91, 182.23, 174.77, 170.45, 169.39, 169.89, 170.87, 172.02, 173.28, 174.54, 175.73, 176.79, 177.66, 178.3],
      arrivals: [23.56, 26.37, 27.87, 28.86, 29.68, 30.38, 30.91, 31.25, 31.36, 31.25, 30.91, 30.38, 29.68, 28.87],
      naive: 175.0,
      pred48: 165.0,
      pred72: 166.0,
      ma7: 176.4,
      dir48: "STABLE",
      dir72: "STABLE",
    },
    MEEGODA: {
      name: "Meegoda Economic Centre",
      series: [176.59, 177.21, 178.07, 179.11, 180.3, 181.55, 182.79, 183.97, 185.0, 185.84, 186.44, 186.77, 186.83, 186.61],
      arrivals: [69.43, 70.65, 71.42, 71.68, 71.42, 70.65, 69.43, 67.84, 65.99, 64.0, 62.01, 60.16, 58.57, 57.35],
      naive: 180.0,
      pred48: 172.0,
      pred72: 173.0,
      ma7: 181.3,
      dir48: "STABLE",
      dir72: "STABLE",
    },
    NUWARA_ELIYA: {
      name: "Nuwara Eliya Market",
      series: [186.78, 177.21, 150.79, 122.48, 117.03, 138.85, 168.04, 187.51, 193.03, 188.66, 182.14, 178.61, 178.17, 179.01],
      arrivals: [65.92, 75.09, 63.11, 39.63, 21.48, 14.89, 17.04, 22.81, 27.98, 30.99, 32.41, 33.1, 33.48, 33.6],
      naive: 185.0,
      pred48: 182.0,
      pred72: 183.0,
      ma7: 186.1,
      dir48: "STABLE",
      dir72: "STABLE",
    },
    THAMBUTTEGAMA: {
      name: "Thambuttegama Economic Centre",
      series: [173.72, 174.84, 176.01, 177.19, 178.29, 179.26, 180.04, 180.58, 180.9, 181.2, 182.39, 185.62, 188.54, 181.87],
      arrivals: [44.16, 43.39, 42.4, 41.24, 40.0, 38.76, 37.6, 36.61, 35.98, 36.81, 43.4, 61.96, 88.56, 102.61],
      naive: 190.0,
      pred48: 174.0,
      pred72: 175.0,
      ma7: 191.2,
      dir48: "STABLE",
      dir72: "STABLE",
    },
    JAFFNA: {
      name: "Jaffna Market",
      series: [185.14, 186.26, 187.23, 188.0, 188.53, 188.79, 188.77, 188.47, 187.94, 187.2, 186.32, 185.37, 184.41, 183.52],
      arrivals: [31.01, 30.08, 29.28, 28.67, 28.29, 28.16, 28.29, 28.67, 29.28, 30.08, 31.01, 32.0, 32.99, 33.92],
      naive: 160.0,
      pred48: 158.0,
      pred72: 159.0,
      ma7: 161.4,
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
      arrivalVolumeTonnes: entry.arrivals[idx] ?? null,
    };
  });

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
        baselineNaiveLkr: entry.naive,
        baselineMa7Lkr: entry.ma7,
        direction: entry.dir48,
      },
      {
        horizonHours: 72,
        predictedPriceLkr: entry.pred72,
        baselineNaiveLkr: entry.naive,
        baselineMa7Lkr: entry.ma7,
        direction: entry.dir72,
      },
    ],
  };
}

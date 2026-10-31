import { useEffect, useMemo, useState } from "react";
import { MapPin, Sprout, Truck, Wheat } from "lucide-react";
import { fetchMetadataConfig } from "../api/atieClient";
import type {
  AnalyzeRequest,
  MetadataConfig,
} from "../types/atie";

interface Props {
  value: AnalyzeRequest;
  onChange: (request: AnalyzeRequest) => void;
  onAnalyze: () => void;
  onDemo: () => void;
  loading: boolean;
}

export function OnboardingConfigModal({
  value,
  onChange,
  onAnalyze,
  onDemo,
  loading,
}: Props) {
  const [metadata, setMetadata] = useState<MetadataConfig | null>(null);
  const [metadataError, setMetadataError] = useState(false);
  const [quantityDraft, setQuantityDraft] = useState(() =>
    String(value.quantityKg),
  );

  useEffect(() => {
    setQuantityDraft(String(value.quantityKg));
  }, [value.quantityKg]);

  useEffect(() => {
    let active = true;
    fetchMetadataConfig()
      .then((config) => {
        if (active) setMetadata(config);
      })
      .catch(() => {
        if (active) setMetadataError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const reachableMarkets = useMemo(() => {
    if (!metadata) return [];
    const allowed = new Set(
      metadata.routes
        .filter((route) => route.originCode === value.originCode)
        .map((route) => route.marketCode),
    );
    return metadata.markets.filter((market) => allowed.has(market.code));
  }, [metadata, value.originCode]);

  const update = <K extends keyof AnalyzeRequest>(
    key: K,
    next: AnalyzeRequest[K],
  ) => onChange({ ...value, [key]: next });

  function updateOrigin(originCode: string) {
    const nextMarkets = metadata?.routes
      .filter((route) => route.originCode === originCode)
      .map((route) => route.marketCode);
    const keepDefault =
      !nextMarkets || nextMarkets.includes(value.defaultMarketCode);
    onChange({
      ...value,
      originCode,
      defaultMarketCode: keepDefault
        ? value.defaultMarketCode
        : (nextMarkets?.[0] ?? value.defaultMarketCode),
    });
  }

  const selectedRoute = metadata?.routes.find(
    (route) =>
      route.originCode === value.originCode &&
      route.marketCode === value.defaultMarketCode,
  );

  return (
    <section
      aria-label="Consignment setup"
      className="rise-in rounded-[2rem] border border-ink/10 bg-cream/90 p-5 shadow-card backdrop-blur md:p-7"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-moss">
            Consignment setup
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink md:text-3xl">
            Tell us what is leaving the farm.
          </h2>
        </div>
        <button
          type="button"
          onClick={onDemo}
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-cream transition hover:-translate-y-0.5 hover:bg-moss"
        >
          <Sprout className="h-4 w-4 text-lime transition group-hover:rotate-6" />
          Load Northern glut demo
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Field label="Origin" icon={<MapPin className="h-4 w-4" />}>
          <select
            value={value.originCode}
            onChange={(event) => updateOrigin(event.target.value)}
            className="field"
          >
            {(metadata?.origins ?? fallbackOrigins).map((origin) => (
              <option key={origin.code} value={origin.code}>
                {origin.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Default market" icon={<MapPin className="h-4 w-4" />}>
          <select
            value={value.defaultMarketCode}
            onChange={(event) =>
              update("defaultMarketCode", event.target.value)
            }
            className="field"
          >
            {(reachableMarkets.length > 0
              ? reachableMarkets
              : fallbackMarkets
            ).map((market) => (
              <option key={market.code} value={market.code}>
                {market.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Crop" icon={<Wheat className="h-4 w-4" />}>
          <select
            value={value.cropCode}
            onChange={(event) => update("cropCode", event.target.value)}
            className="field"
          >
            {(metadata?.crops ?? fallbackCrops).map((crop) => (
              <option key={crop.code} value={crop.code}>
                {crop.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Harvest (kg)" icon={<Wheat className="h-4 w-4" />}>
          <input
            type="number"
            min={1}
            max={100000}
            value={quantityDraft}
            onChange={(event) => {
              const raw = event.target.value;
              setQuantityDraft(raw);
              const parsed = Number(raw);
              if (raw.trim() !== "" && Number.isFinite(parsed) && parsed > 0) {
                const clamped = Math.min(100_000, parsed);
                update("quantityKg", clamped);
              }
            }}
            onBlur={() => {
              const parsed = Number(quantityDraft);
              if (
                quantityDraft.trim() === "" ||
                !Number.isFinite(parsed) ||
                parsed <= 0
              ) {
                setQuantityDraft(String(value.quantityKg));
                return;
              }
              const clamped = Math.min(100_000, Math.max(1, parsed));
              setQuantityDraft(String(clamped));
              if (clamped !== value.quantityKg) {
                update("quantityKg", clamped);
              }
            }}
            className="field"
          />
        </Field>

        <Field label="Vehicle" icon={<Truck className="h-4 w-4" />}>
          <select
            value={value.vehicleType}
            onChange={(event) =>
              update(
                "vehicleType",
                event.target.value as AnalyzeRequest["vehicleType"],
              )
            }
            className="field"
          >
            {(metadata?.vehicleTypes ?? fallbackVehicles).map((vehicle) => (
              <option key={vehicle.code} value={vehicle.code}>
                {vehicle.displayName} · {formatCapacity(vehicle.capacityKg)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Forecast" icon={<MapPin className="h-4 w-4" />}>
          <select
            value={value.horizonHours}
            onChange={(event) =>
              update("horizonHours", Number(event.target.value) as 48 | 72)
            }
            className="field"
          >
            {(metadata?.horizons ?? [48, 72]).map((horizon) => (
              <option key={horizon} value={horizon}>
                {horizon} hours
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="max-w-xl text-xs leading-relaxed text-ink/55">
            Recommendations compare net profit after fuel, terrain, handling and
            spoilage. A reroute requires a{" "}
            {formatThreshold(metadata?.thresholds.safeMarginPct, 5)}% margin and{" "}
            {formatLkrThreshold(metadata?.thresholds.safeAbsoluteFloorLkr)} minimum
            gain.
          </p>
          <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-ink/35">
            {selectedRoute
              ? `${selectedRoute.distanceKm.toFixed(0)} km one way · terrain ×${selectedRoute.terrainFactor.toFixed(2)}`
              : metadataError
                ? "Metadata API unavailable · using verified defaults"
                : "Loading route configuration"}
          </p>
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading}
          className="rounded-full bg-clay px-6 py-3 text-sm font-extrabold text-cream transition hover:-translate-y-0.5 hover:bg-[#ad4f2d] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Calculating safest route…" : "Analyze market route"}
        </button>
      </div>
    </section>
  );
}

const fallbackOrigins = [
  { code: "ANURADHAPURA", name: "Anuradhapura" },
  { code: "JAFFNA", name: "Jaffna" },
  { code: "DAMBULLA", name: "Dambulla" },
  { code: "NUWARA_ELIYA", name: "Nuwara Eliya" },
  { code: "THAMBUTTEGAMA", name: "Thambuttegama" },
];

const fallbackMarkets = [
  { code: "DAMBULLA", name: "Dambulla" },
  { code: "PETTAH_COLOMBO", name: "Colombo Pettah" },
  { code: "KEPPETIPOLA", name: "Keppetipola" },
  { code: "MEEGODA", name: "Meegoda" },
  { code: "NUWARA_ELIYA", name: "Nuwara Eliya" },
  { code: "THAMBUTTEGAMA", name: "Thambuttegama" },
  { code: "JAFFNA", name: "Jaffna" },
];

const fallbackCrops = [
  { code: "TOMATO", name: "Tomato" },
  { code: "CARROT", name: "Carrot" },
  { code: "GREEN_CHILI", name: "Green chili" },
  { code: "RED_ONION", name: "Red onion" },
];

const fallbackVehicles = [
  { code: "THREE_WHEELER" as const, displayName: "Three-wheeler", capacityKg: 300 },
  {
    code: "MINI_TRUCK_BATTA" as const,
    displayName: "Batta mini-truck",
    capacityKg: 1500,
  },
  { code: "LORRY_3_5T" as const, displayName: "3.5 tonne lorry", capacityKg: 3500 },
];

function formatCapacity(capacityKg: number) {
  return capacityKg >= 1000 ? `${capacityKg / 1000} t` : `${capacityKg} kg`;
}

function formatThreshold(value: number | undefined, fallback: number) {
  return (value ?? fallback).toFixed(0);
}

function formatLkrThreshold(value: number | undefined) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(value ?? 1000);
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 font-mono text-[0.63rem] font-semibold uppercase tracking-[0.15em] text-ink/55">
        <span className="text-leaf">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

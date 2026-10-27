import { MapPin, Sprout, Truck, Wheat } from "lucide-react";
import type { AnalyzeRequest } from "../types/atie";

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
  const update = <K extends keyof AnalyzeRequest>(
    key: K,
    next: AnalyzeRequest[K],
  ) => onChange({ ...value, [key]: next });

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
            onChange={(event) => update("originCode", event.target.value)}
            className="field"
          >
            <option value="ANURADHAPURA">Anuradhapura</option>
            <option value="JAFFNA">Jaffna</option>
            <option value="DAMBULLA">Dambulla</option>
            <option value="NUWARA_ELIYA">Nuwara Eliya</option>
            <option value="THAMBUTTEGAMA">Thambuttegama</option>
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
            <option value="DAMBULLA">Dambulla</option>
            <option value="PETTAH_COLOMBO">Colombo Pettah</option>
            <option value="KEPPETIPOLA">Keppetipola</option>
            <option value="MEEGODA">Meegoda</option>
          </select>
        </Field>

        <Field label="Crop" icon={<Wheat className="h-4 w-4" />}>
          <select
            value={value.cropCode}
            onChange={(event) => update("cropCode", event.target.value)}
            className="field"
          >
            <option value="TOMATO">Tomato</option>
            <option value="CARROT">Carrot</option>
            <option value="GREEN_CHILI">Green chili</option>
            <option value="RED_ONION">Red onion</option>
          </select>
        </Field>

        <Field label="Harvest (kg)" icon={<Wheat className="h-4 w-4" />}>
          <input
            type="number"
            min={1}
            max={100000}
            value={value.quantityKg}
            onChange={(event) =>
              update("quantityKg", Number(event.target.value))
            }
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
            <option value="THREE_WHEELER">Three-wheeler · 300 kg</option>
            <option value="MINI_TRUCK_BATTA">Batta mini-truck · 1.5 t</option>
            <option value="LORRY_3_5T">Lorry · 3.5 t</option>
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
            <option value={48}>48 hours</option>
            <option value={72}>72 hours</option>
          </select>
        </Field>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-relaxed text-ink/55">
          Recommendations compare net profit after fuel, terrain, handling and
          spoilage. A reroute requires a 5% margin and LKR 1,000 minimum gain.
        </p>
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

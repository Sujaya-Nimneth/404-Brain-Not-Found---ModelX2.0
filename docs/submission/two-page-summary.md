# ATIE: Safe Market Routing For Sri Lankan Produce

**ModelX 2.0 - Two-Page Summary**  
Team 404 Brain not found | Informatics Institute of Technology

## The Problem

Smallholder farmers and informal traders often decide where to send produce
without knowing whether a local market will be glutted when the consignment
arrives. A higher quoted price can still be the wrong choice after transport,
spoilage, terrain, handling, and vehicle costs.

ATIE predicts wholesale prices 48 and 72 hours ahead and turns those forecasts
into a safe routing directive. It is built for the operational question:

> Where should this consignment go to produce the best net outcome?

## The Product

The dashboard takes an origin, default market, crop, quantity, vehicle, and
forecast horizon. It returns:

- one primary directive: reroute, proceed, or hold;
- the recommended destination and its profit delta;
- every market's current and predicted price;
- gross revenue, fuel, spoilage, handling, and net profit;
- weather and supply context;
- the forecast source and data freshness.

The canonical competition scenario is 1,000 kg of tomatoes from
Anuradhapura. Dambulla is the default market; Colombo Pettah is the safe
alternative. The fixture reports a Dambulla crash from `LKR 220.00` to
`LKR 154.00`, a `LKR 23,238.58` profit improvement, and `15.84%` uplift.

## How It Works

```text
React dashboard
      |
Spring Boot API ----> PostgreSQL
      |
Python ML service ----> Random Forest artifact
      ^
Ingestion worker ----> HDX / Open-Meteo / CROPIX (optional)
```

The ML service forecasts prices. The backend owns the money and the safety
decision:

```text
uplift = (alternative net profit - default net profit)
         / default net profit * 100

reroute only when uplift >= 5% and delta >= LKR 1,000
```

Net profit uses effective volume after spoilage, round-trip terrain-adjusted
fuel, and handling. Decimal arithmetic is used for every routing decision.

## Evaluation

The model is evaluated on a chronological holdout against two required
baselines: naive persistence and a seven-day moving average.

| Horizon | Model DS | Model MAE | Model SM-FPR | Reroutes |
|---|---:|---:|---:|---:|
| 48h | 67.89% | 6.05 LKR/kg | 3.00% | 6,502 |
| 72h | 68.74% | 6.62 LKR/kg | 4.96% | 6,669 |

SM-FPR is the rate at which a reroute recommendation loses against the default
market after realized holdout prices are substituted. It is a routing
backtest, not a price-error proxy. The 48h naive baseline has SM-FPR `4.43%`;
the MA7 baseline has `7.25%`. The 72h model remains under the five-percent
target.

## Data Honesty

The live-data panel is a product feature, not an implementation detail. Every
source is labeled `LIVE`, `CACHED`, `SEED`, or `UNAVAILABLE`. The current
verified snapshot is:

| Source | State | Meaning |
|---|---|---|
| Open-Meteo | `LIVE / CURRENT` | weather forecasts are current |
| WFP / HDX | `LIVE / STALE` | supported wholesale observations end in April 2021 |
| CROPIX | `UNAVAILABLE` | no working endpoint is configured |

The model remains trained on checked-in seed history. Live ingestion refreshes
weather, supported historical rows, and provenance; it does not silently
retrain the model or relabel retail data as wholesale.

## Reliability And Evidence

- The model, fallback snapshot, and canonical fixture are checked into the
  repository.
- A failed live call is visibly labeled and never presented as a live answer.
- The API returns `X-Request-ID`; the backend exposes health and metrics.
- Optional API-key protection is disabled by default for judging.
- CI covers PostgreSQL-backed ML tests, backend tests, frontend unit tests,
  lint/build, and a Compose-backed Playwright browser test.
- The final dashboard evidence is `docs/evidence/live-dashboard.png`; the
  three-minute walkthrough is `docs/evidence/atie-demo.mp4`.

## Run It

```bash
cp .env.example .env
docker compose up --build -d --wait
```

Open the dashboard at `http://localhost:15173`, Swagger at
`http://localhost:8080/swagger-ui.html`, and provenance at
`http://localhost:8080/api/v1/metadata/data-status`.

The normative rules are in `CONTRACTS.md`; implementation and verification
details are in `README.md` and `IMPLEMENTATION_PLAN.md`.

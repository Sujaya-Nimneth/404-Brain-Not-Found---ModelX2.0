# ATIE Decision Contracts

This document fixes cross-service behavior that is otherwise open to
interpretation in `IMPLEMENTATION_PLAN.md`. It is normative for the database,
ML service, backend, frontend, and tests. If another document is less specific,
this document takes precedence. If this document conflicts with a mandatory
safety rule in `AGENTS.md`, `AGENTS.md` takes precedence.

All monetary arithmetic in the backend and evaluation pipeline must use decimal
arithmetic. Binary floating-point is permitted only inside model training and
inference, never for a routing decision.

## 1. Safe-Margin Rerouting

Compare markets using **net profit after all deductions**, never price, gross
revenue, or profit per kilogram alone.

Let:

- `NP_default` be the net profit at the farmer's requested default market.
- `NP_alt` be the net profit at a candidate alternative market.
- `SAFE_MARGIN_PCT = 5.0`, supplied as validated configuration and never
  hard-coded independently in multiple services.
- `SAFE_ABSOLUTE_FLOOR_LKR = 1000.00`, supplied as validated configuration.

The relative uplift is:

```text
profit_delta_lkr = NP_alt - NP_default
profit_uplift_pct = (profit_delta_lkr / NP_default) * 100
```

The percentage is a **relative uplift over the default market**, not a
percentage-point difference and not a margin over revenue.

For a positive default-market profit, `CRITICAL_REROUTE` is permitted only
when all of the following hold:

```text
NP_default > 0
NP_alt > NP_default
profit_uplift_pct >= SAFE_MARGIN_PCT
profit_delta_lkr >= SAFE_ABSOLUTE_FLOOR_LKR
the alternative is the highest-net-profit eligible candidate
```

If `NP_default <= 0`, `profit_uplift_pct` must be `null`; a negative
denominator must never be used to manufacture a positive percentage. In that
case, return `CRITICAL_REROUTE` when `NP_alt > 0` and
`profit_delta_lkr >= SAFE_ABSOLUTE_FLOOR_LKR`; otherwise return
`HOLD_HARVEST`. Never tell a farmer to proceed to a non-positive-profit
default market.

For multiple viable alternatives, recommend the alternative with the greatest
net profit, provided it passes the safe-margin rule. If no alternative passes,
return `PROCEED_DEFAULT` when the default market is profitable, or
`HOLD_HARVEST` when it is not.

The API must return both `profit_delta_lkr` and `profit_uplift_pct`; the
frontend must not recompute either value.

The final directive is selected in this order:

| Condition | Directive |
|---|---|
| A candidate passes the applicable reroute rule | `CRITICAL_REROUTE` |
| No candidate passes and `NP_default > 0` | `PROCEED_DEFAULT` |
| No candidate passes and `NP_default <= 0` | `HOLD_HARVEST` |

`is_recommended` is true only for the selected reroute destination. It is false
for every market under `PROCEED_DEFAULT` and `HOLD_HARVEST`.

### Canonical net-profit formula

For destination market `m`, crop `c`, vehicle `v`, and quantity `Q`:

```text
terrain_adjusted_distance_km = one_way_distance_km * road_terrain_factor
spoilage_fraction = one_way_distance_km / 100
                    * spoilage_rate_per_100km_pct / 100
effective_volume_kg = Q * (1 - spoilage_fraction)
trips = ceil(Q / vehicle_capacity_kg)

fuel_cost_lkr = 2 * terrain_adjusted_distance_km
                * fuel_litres_per_km * fuel_price_lkr_per_litre * trips
handling_cost_lkr = Q * handling_fee_per_kg_lkr
spoilage_loss_lkr = (Q - effective_volume_kg) * predicted_price_lkr_per_kg
gross_revenue_lkr = effective_volume_kg * predicted_price_lkr_per_kg
net_profit_lkr = gross_revenue_lkr - fuel_cost_lkr - handling_cost_lkr
```

`spoilage_loss_lkr` is a reported opportunity cost and is already represented
by the difference between `Q` and `effective_volume_kg`; it must not be
subtracted from net profit a second time. Spoilage is based on one-way road
distance as specified in `IMPLEMENTATION_PLAN.md`; terrain affects fuel cost,
not the spoilage percentage.

Round each displayed monetary value half-up to two decimal places and each
displayed percentage to two decimal places. Keep unrounded values for
comparisons and directive decisions.

## 2. Price Movement Classification

For each market and horizon:

```text
pct_change = (predicted_price_lkr - current_price_lkr)
             / current_price_lkr * 100
```

The initial operational thresholds are:

```text
pct_change <= -10.0  -> CRASH
pct_change >= +10.0  -> SURGE
otherwise            -> STABLE
```

`MOVEMENT_THRESHOLD_PCT = 10.0` is configuration shared by the ML response and
frontend presentation. Classify from the unrounded percentage, then round for
display.

`direction` is an operational label shown to users. Directional Symmetry is a
separate model metric based on the signs of the actual and predicted changes:

```text
(actual_future_price - current_price)
* (predicted_future_price - current_price) > 0
```

A prediction with no price movement is not a directional success. A zero
current price is invalid input and must be rejected rather than classified.

## 3. Origin Representation

Origins are configuration-backed entities, not rows in `markets`.

`market_routes.origin_code` is the stable identifier. A single versioned
configuration file supplies each origin's:

- code and display name
- district and province
- latitude and longitude
- supply zone used for weather features

`GET /api/v1/metadata/config` must return origins from this same source. The
database must enforce a unique `(origin_code, destination_market_id)` route and
positive distances, durations, and terrain factors.

Do not seed `ANURADHAPURA` as a market. It is a production origin. A market is
a valid destination only if the requested origin has a route to it.

The backend must validate origin, market, crop, vehicle, quantity, and horizon
before invoking downstream services. Unknown or incomplete combinations return
HTTP `400` with a machine-readable error code; they must never surface as
`500`, silently fall back to another origin, or reuse an unrelated route.

## 4. Safe-Margin False Positive Rate

SM-FPR is a chronological out-of-sample backtest of complete routing decisions,
not merely a price-error metric.

For every eligible origin, crop, vehicle, quantity scenario, horizon, and
timestamp `t` in the holdout period:

1. Build features using only information available at or before `t`.
2. Forecast every candidate market at `t + horizon`.
3. Apply the production net-profit calculator and safe-margin rule.
4. Record a reroute decision when the alternative passes the rule.
5. At `t + horizon`, substitute realized prices while holding route, terrain,
   fuel, handling, spoilage, and vehicle assumptions fixed at their values from
   `t`.
6. Count a false positive when a reroute was recommended but the alternative's
   realized net profit is less than the default market's realized net profit.

The metric is:

```text
SM-FPR = 100 * false_reroute_decisions / reroute_decisions
```

Evaluate and expose the trained model, naive forecast, and MA7 forecast
separately for 48 and 72 hours. Report `reroute_count` and
`false_reroute_count` alongside the percentage.

The operational evaluation matrix is finite and versioned:

- origins: `ANURADHAPURA`, `JAFFNA`, `DAMBULLA`, `NUWARA_ELIYA`,
  `THAMBUTTEGAMA`
- default market: `DAMBULLA` for every origin
- compared alternatives: the two nearest other reachable markets for each
  origin
- crops: `TOMATO`, `CARROT`, `GREEN_CHILI`, `RED_ONION`
- vehicles: `THREE_WHEELER`, `MINI_TRUCK_BATTA`, `LORRY_3_5T`
- quantities: `300`, `1000`, `1500`, `3500` kg
- horizons: `48`, `72` hours

The default market is fixed to Dambulla so the reported metric remains
comparable across runs. The two alternatives are selected by configured
one-way distance, with market code as the tie-breaker. The matrix is
intentionally finite and does not claim coverage of every possible farm
quantity.

If `reroute_decisions == 0`, `safe_margin_fpr_pct` is `null`, never `0`.
Evaluation must use the same safe-margin and net-profit implementation as the
backend. A separate Python reimplementation is permitted only if it is covered
by shared golden fixtures.

## 5. Forecast Source and Canonical Scenario

Every forecast must identify exactly one source:

```text
MODEL        serialized trained model produced normal inference
FALLBACK     deterministic heuristic used because the model is unavailable
DEMO_FIXTURE explicit canonical competition fixture
```

The `forecast_source` field must be present in the ML response, backend
response, and frontend. The UI must visibly label `FALLBACK` and
`DEMO_FIXTURE`; demo values must never be silently presented as live model
output.

`POST /api/v1/directives/analyze` accepts an optional boolean `demo_mode` that
defaults to `false`. When `demo_mode` is `true`, the request must match a
registered canonical fixture or return HTTP `400`; the response source is
`DEMO_FIXTURE`. When it is `false`, the ML service selects `MODEL` or
`FALLBACK` from actual availability. Clients cannot request `MODEL` or
`FALLBACK` directly. The frontend's demo preset sets `demo_mode: true` and
shows the source badge.

The backend passes `forecast_source` on to the frontend as a top-level
response field. The value describes the entire directive response. An
end-to-end request must never mix market predictions from different sources.

The canonical scenario is:

```text
origin_code: ANURADHAPURA
default_market_code: DAMBULLA
crop_code: TOMATO
quantity_kg: 1000
vehicle_type: MINI_TRUCK_BATTA
horizon_hours: 48
```

The seeded history must contain a reproducible Northern supply-glut pattern.
Model training and the chronological split must use fixed seeds. The repository
must include a checked-in model artifact plus a local fallback snapshot.

The acceptance test requests `DEMO_FIXTURE` explicitly with
`"demo_mode": true`. The same canonical request with `demo_mode: false` must
run normally under `MODEL` or `FALLBACK` and must not be special-cased to
return the fixture values.

### Canonical regression fixture

The fixture uses these deterministic inputs:

| Input | Value |
|---|---:|
| Quantity | 1000 kg |
| Vehicle | `MINI_TRUCK_BATTA` |
| Capacity | 1500 kg |
| Fuel use | 0.08 L/km |
| Fuel type | Diesel |
| Diesel price | LKR 283.00/L |
| Tomato spoilage | 1.50% per 100 km |
| Handling fee, all compared markets | LKR 2.50/kg |

| Market | Current LKR/kg | 48h predicted LKR/kg | One-way km | Terrain | Direction |
|---|---:|---:|---:|---:|---|
| Dambulla | 220.00 | 154.00 | 70.00 | 1.00 | CRASH |
| Pettah Colombo | 170.00 | 187.50 | 205.00 | 1.00 | SURGE |
| Keppetipola | 175.00 | 165.00 | 175.00 | 1.25 | STABLE |
| Meegoda | 180.00 | 172.00 | 195.00 | 1.00 | STABLE |

Expected market calculations:

| Market | Effective kg | Gross revenue | Fuel cost | Handling | Net profit |
|---|---:|---:|---:|---:|---:|
| Pettah Colombo | 969.25 | 181,734.38 | 9,282.40 | 2,500.00 | 169,951.98 |
| Meegoda | 970.75 | 166,969.00 | 8,829.60 | 2,500.00 | 155,639.40 |
| Keppetipola | 973.75 | 160,668.75 | 9,905.00 | 2,500.00 | 148,263.75 |
| Dambulla | 989.50 | 152,383.00 | 3,169.60 | 2,500.00 | 146,713.40 |

Expected decision:

```text
Dambulla pct_change:          -30.00%
Dambulla direction:           CRASH
Recommended market:           PETTAH_COLOMBO
profit_delta_lkr:             23,238.58
profit_uplift_pct:            15.84%
primary_directive:            CRITICAL_REROUTE
forecast_source:              DEMO_FIXTURE
```

The 72-hour variant must also preserve the direction and safe-margin decision,
but it is not required to reproduce the same prices. The proposal's original
`LKR 275/kg` Pettah sample is illustrative only and is not an acceptance value:
it is arithmetically inconsistent with the stated `~15%` net-profit uplift.

## 6. Cross-Service Contract Tests

Before each workstream is considered complete, tests must prove:

- exact net-profit calculations and safe-margin thresholds from this document
- `STABLE` classification at boundaries just inside `+/-10%`, and
  `CRASH`/`SURGE` at the inclusive boundaries
- `null` uplift, absolute-floor behavior, and `HOLD_HARVEST` for a
  non-positive default-market profit
- origin validation and missing-route HTTP `400` behavior
- `null` SM-FPR when there are no reroute decisions
- explicit and visible `MODEL`, `FALLBACK`, and `DEMO_FIXTURE` sources
- `demo_mode: true` rejection when the request does not match a registered
  fixture
- the canonical fixture produces the expected directive and numbers

The canonical scenario must also be exercised end-to-end through the backend
and rendered dashboard, not only at the calculator or ML layer.

## 7. Live Data Provenance and Freshness

ATIE distinguishes a data source from the state of a fetch. A source is never
described as live merely because a network adapter exists.

Every ingestion attempt must write one row to `data_ingestion_runs` with:

- a stable `source_code`: `HDX`, `CROPIX`, or `OPEN_METEO`
- a terminal `status`: `SUCCESS`, `FALLBACK`, or `FAILED`
- the active `data_state`: `LIVE`, `CACHED`, `SEED`, or `UNAVAILABLE`
- `started_at`, `finished_at`, `records_received`, `records_written`
- the upstream URL or local cache path actually used
- a bounded error message when the attempt did not succeed

The latest successful observation for each source is also recorded in
`data_source_status`, including `last_success_at`, `latest_observation_date`,
the source URL, and the number of records written. A fallback attempt must not
advance `last_success_at`.

The provenance values on stored observations are:

```text
HDX_LIVE       HDX data fetched from the verified HDX resource
HDX_CACHED     normalized HDX data loaded from the local cache
HDX_SEED       deterministic local seed history
CROPIX_LIVE    CROPIX data fetched from a configured live endpoint
CROPIX_CACHED  CROPIX data loaded from a checked-in/local cache
OPEN_METEO_LIVE Open-Meteo forecast fetched successfully
OPEN_METEO_CACHED Open-Meteo data loaded from local cache
SEED           deterministic local values
```

Live price ingestion must be idempotent on
`(market_id, crop_id, recorded_date)`. An upsert may replace a seeded value
only when the incoming row is genuinely live and maps to a supported market and
crop. The adapter must not invent a market or commodity mapping.

The initial verified HDX resource is
`wfp-food-prices-for-sri-lanka`. It is a WFP monthly price series with
historical Dambulla/Pettah wholesale coverage and broader retail coverage.
Consequently, the presence of an HDX success does not by itself make all seven
markets or all four crops current. Missing combinations retain their existing
source and are reported as gaps, never backfilled and relabeled as live.

The configured CROPIX hosts currently do not resolve. CROPIX ingestion must
therefore return a visible `UNAVAILABLE` or `CACHED` state and must not block
startup or inference. A later working endpoint can be supplied through
configuration without changing the contract.

Open-Meteo is the live weather source. Each successful market/day response is
upserted on `(market_id, observation_date)` with the daily precipitation and
temperature values. A fallback response keeps the last verified weather row
and records a fallback attempt.

`GET /api/v1/metadata/data-status` returns:

- overall `status`: `LIVE`, `PARTIAL`, `FALLBACK`, or `UNAVAILABLE`
- `generated_at`
- one entry per source with its latest state, timestamps, counts, and message
- `price_coverage`: supported market/crop combinations with latest
  observation date and provenance

The endpoint is read-only and must remain available even when every upstream
source is offline. The dashboard must display the distinction between live and
seeded/fallback data.

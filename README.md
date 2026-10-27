# ATIE: Agricultural Trade & Intelligence Engine

ATIE predicts Sri Lankan wholesale crop prices 48-72 hours ahead, then ranks
destination markets by **net profit after fuel, terrain, spoilage, and handling
costs**. It emits a routing directive only when a candidate clears the configured
safe-margin rule.

Team 404 Brain not found, ModelX 2.0.

## Architecture

```text
React + Vite dashboard (:15173 in Compose)
                 |
                 v
Spring Boot API (:8080) -----> PostgreSQL 16 (:55432 on the host)
        |
        v
FastAPI + RandomForest (:18000 in Compose)
```

The checked-in model artifact and fallback snapshot make the demo independent
of external government or weather APIs. Forecast responses always identify
their source as `MODEL`, `FALLBACK`, or `DEMO_FIXTURE`.

## Run The Full Stack

Requirements: Docker Desktop with Compose v2.

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

Open:

- Dashboard: http://localhost:15173
- Swagger UI: http://localhost:8080/swagger-ui.html
- Backend health: http://localhost:8080/actuator/health
- ML health: http://localhost:18000/health
- ML metrics: http://localhost:18000/metrics

The default ports avoid collisions with an existing local stack. Override
`POSTGRES_PORT`, `BACKEND_PORT`, `ML_SERVICE_PORT`, or `FRONTEND_PORT` in
`.env` when needed.

## Canonical Demo

The competition fixture is 1,000 kg of tomatoes from Anuradhapura, targeting
Dambulla over 48 hours:

```bash
curl -sS -X POST http://localhost:8080/api/v1/directives/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "origin_code": "ANURADHAPURA",
    "default_market_code": "DAMBULLA",
    "crop_code": "TOMATO",
    "quantity_kg": 1000,
    "vehicle_type": "MINI_TRUCK_BATTA",
    "horizon_hours": 48,
    "demo_mode": true
  }'
```

Expected result:

```text
forecast_source:      DEMO_FIXTURE
primary_directive:    CRITICAL_REROUTE
recommended market:   PETTAH_COLOMBO
profit_delta_lkr:     23238.58
profit_uplift_pct:    15.84
```

Set `"demo_mode": false` to run normal `MODEL` or `FALLBACK` inference. A
non-canonical request with `demo_mode: true` returns HTTP `400`.

## Market History And Forecast Trace

The dashboard's forecast trace is backed by:

```bash
curl -sS \
  'http://localhost:8080/api/v1/markets/DAMBULLA/history?cropCode=TOMATO&days=14'
```

The endpoint returns the latest requested history in chronological order plus
the 48h and 72h model, naive, and MA7 trajectories. Its reference date comes
from the latest stored observation, so seeded demos do not disappear as the
wall clock advances.

The onboarding controls load origins, routes, markets, crops, vehicles,
horizons, thresholds, and fuel prices from:

```bash
curl -sS http://localhost:8080/api/v1/metadata/config
```

If the live analysis API is unavailable, the dashboard retains the verified
fixture and displays the failure explicitly. It never silently presents a
fixture as a successful live response.

## Local Development

### ML service

```bash
cd ml-service
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
uvicorn app.main:app --reload --port 18000
```

Retrain the deterministic artifact and evaluation report:

```bash
python -m training.train_model
```

### Backend

Use Java 21. Point the backend at a PostgreSQL instance seeded with
`db/init.sql` and `db/seed.sql`.

```bash
cd backend
mvn test
DATABASE_URL=jdbc:postgresql://localhost:55432/atie \
DATABASE_USERNAME=atie \
DATABASE_PASSWORD=atie_dev_password \
ML_SERVICE_URL=http://localhost:18000 \
mvn spring-boot:run
```

Run the opt-in PostgreSQL schema integration test while the Compose database is
running:

```bash
cd backend
mvn -Ppostgres-it \
  -DATIE_TEST_DATABASE_URL=jdbc:postgresql://localhost:55432/atie \
  -DATIE_TEST_DATABASE_USERNAME=atie \
  -DATIE_TEST_DATABASE_PASSWORD=atie_dev_password \
  test
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
npm run build
```

The Vite dev server proxies `/api` to `http://localhost:8080`.

## Verification

```bash
cd ml-service && pytest
cd ../backend && mvn test
cd ../frontend && npm run build
docker compose --env-file .env.example config
```

The contract source of truth is [CONTRACTS.md](CONTRACTS.md). Architecture and
workstream details are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Evaluation Snapshot

Chronological holdout results are stored in
`ml-service/models/evaluation_report.json`. The trained model currently reports:

| Horizon | DS | MAE (LKR/kg) | SM-FPR | Reroutes |
|---|---:|---:|---:|---:|
| 48h | 67.89% | 6.05 | 3.00% | 6,502 |
| 72h | 68.74% | 6.62 | 4.96% | 6,669 |

Naive and 7-day moving-average baselines are evaluated alongside the model.
SM-FPR is `null` when no reroute decisions occur, never silently reported as
zero.

The fallback snapshot covers all four crops across all seven markets at both
horizons. SM-FPR backtests 60 scenarios per horizon: five origins against
Dambulla and their two nearest alternatives, four crops, three vehicle types,
and quantities of 300, 1,000, 1,500, and 3,500 kg. The matrix is deliberately
finite and does not claim coverage of every possible origin or consignment.

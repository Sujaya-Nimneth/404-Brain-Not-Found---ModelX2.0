# ATIE (Agricultural Trade & Intelligence Engine) — Master Implementation Plan
**Project:** ModelX 2.0 Competition Entry  
**Team:** 404 Brain not found (Informatics Institute of Technology - IEEE CIS Student Chapter)  
**Domain:** 01 — Cost of Living and Everyday Economics  
**Target Coding Agents:** Google Antigravity, OpenAI Codex, Claude Code, Cursor  

## 1. Executive Summary & System Directive

**ATIE (Agricultural Trade & Intelligence Engine)** is a predictive decision-support platform designed for Sri Lankan smallholder farmers and informal market traders. Rather than merely displaying current market prices (simple retrieval), ATIE analyzes historical crop yield/price data, regional weather patterns, and current fuel/transport costs to predict localized price crashes (gluts) or surges (shortages) **48 to 72 hours in advance** and recommends optimal market routing after accounting for transport expenses.

### Core Value Proposition (The "Primary Directive")
> *"Do not send your tomatoes to the Dambulla market tomorrow; a supply glut from the Northern province is predicted to crash the price by 30%. Reroute to the Colombo market for a 15% higher profit margin after transport costs."*

### Agentic Operating Principles
1. **Strict Contract-First Execution:** All communication between the React.js Frontend, Java Spring Boot Core API, Python ML Inference Service, and PostgreSQL Database MUST strictly adhere to the JSON schemas and SQL definitions specified in this document.
2. **Zero Spaghetti / Clean Architecture:** Avoid over-engineered abstractions. Keep Spring Boot packages modular (`controller`, `service`, `repository`, `model`, `dto`, `client`) and Python ML code cleanly separated into `etl/`, `training/`, `evaluation/`, and `api/`.
3. **Safety-First Domain Logic:** In ATIE, a **false positive** (telling a farmer to travel further for a worse net profit after transport costs) is a catastrophic failure. Every routing recommendation must satisfy the **Safe Margin Constraint**:
   $$\text{Net Profit}_{\text{alt}} - \text{Net Profit}_{\text{local}} > \text{Safety Buffer Threshold}$$
4. **Resilient Fallback Data Mode:** Because Sri Lankan government data sources (e.g., CROPIX) can be sparse, rate-limited, or temporarily offline, all scrapers and live API connectors MUST implement local caching and deterministic synthetic/historical fallback datasets so the demo and test suite never fail due to upstream downtime.

## 2. Target Monorepo Directory Structure

Agents must scaffold and maintain the following exact directory layout inside the repository root:

```text
.
├── AGENTS.md                        # Agent instructions & architectural guardrails
├── IMPLEMENTATION_PLAN.md           # This master implementation plan
├── README.md                        # Setup, architecture, and verification guide
├── .gitignore                       # Standard Java, Python, Node, and Docker ignores
├── .env.example                     # Environment variables template
├── docker-compose.yml               # Orchestrates PostgreSQL, ML Service, Spring Boot, and Frontend
├── db/
│   ├── init.sql                     # PostgreSQL schema DDL + indexes
│   └── seed.sql                     # Realistic Sri Lankan markets, crops, routes & historical seed data
├── ml-service/                      # Python 3.11+ FastAPI + XGBoost/RandomForest Engine
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI entrypoint (/health, /predict, /forecast-batch, /metrics)
│   │   ├── schemas.py               # Pydantic request/response contracts
│   │   ├── predictor.py             # Model loading, 48-72h inference & directional symmetry logic
│   │   └── fallback.py              # Fallback heuristic forecaster if model artifact is missing
│   ├── etl/
│   │   ├── hdx_loader.py            # Humanitarian Data Exchange (HDX) Sri Lanka food prices ingestion
│   │   ├── weather_client.py        # Open-Meteo / NASA POWER regional weather fetcher
│   │   ├── cropix_scraper.py        # CROPIX scraper with offline fallback cache
│   │   └── feature_engineering.py   # Lag features (7d MA, 14d volatility, rain anomalies, fuel index)
│   ├── training/
│   │   ├── train_model.py           # Trains XGBoost/RandomForest + compares vs Naive & 7-day MA baselines
│   │   └── evaluate.py              # Computes Directional Symmetry (DS) and Mean Absolute Error (MAE)
│   ├── models/                      # Serialized .joblib / .json model artifacts & evaluation_report.json
│   └── tests/
│       └── test_inference.py        # Pytest unit tests for ML endpoints and DS/MAE calculation
├── backend/                         # Java 17/21 Spring Boot 3.x Core API Service
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/modelx/atie/
│       │   │   ├── AtieApplication.java
│       │   │   ├── config/          # CORS, RestClient/WebClient, OpenAPI/Swagger config
│       │   │   ├── controller/      # DirectiveController, MarketController, SimulationController
│       │   │   ├── dto/             # Request/Response records (Java records with Jackson annotations)
│       │   │   ├── entity/          # JPA Entities (Market, Crop, PriceRecord, WeatherRecord, RouteConfig)
│       │   │   ├── repository/      # Spring Data JPA Repositories
│       │   │   ├── client/          # MlServiceClient, OpenMeteoClient
│       │   │   └── service/         # ArbitrageRoutingService, ProfitMarginCalculator, ForecastService
│       │   └── resources/
│       │       └── application.yml
│       └── test/
│           └── java/com/modelx/atie/
│               └── service/ArbitrageRoutingServiceTest.java
└── frontend/                        # React 18 + Vite + Tailwind CSS + Recharts/Lucide
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── api/atieClient.ts
        ├── components/
        │   ├── OnboardingConfigModal.tsx     # Farmer setup: origin location, crop, quantity (kg), vehicle type
        │   ├── PrimaryDirectiveCard.tsx      # Hero alert card with actionable routing directive
        │   ├── ProfitMarginChart.tsx         # Net revenue vs transport cost breakdown across markets
        │   ├── WeatherDisruptionCard.tsx     # 48h-72h regional rainfall/supply glut risk alerts
        │   └── RoutingLogisticsPanel.tsx     # Distance (km), fuel cost (LKR), net profit & route comparison
        └── types/atie.ts
```

## 3. System Architecture & Data Flow

```text
[Farmer / Trader UI (React.js)]
       │
       │ 1. POST /api/v1/directives/analyze (Origin, Crop, Volume_kg, VehicleType, TargetHorizon=48h|72h)
       ▼
[Core Production Backend (Java Spring Boot :8080)]
       ├──► 2. Query PostgreSQL (:5432) for Market Coordinates, Route Distances, Fuel Rates & Recent Prices
       ├──► 3. Fetch Live Regional Weather Forecast (Open-Meteo API / Cached Weather Table)
       ├──► 4. POST /internal/v1/predict-batch to Python ML Service (:8000)
       │         │
       │         ▼
       │    [Intelligence Layer (Python FastAPI + XGBoost/RandomForest)]
       │         ├── Computes 7-day Moving Average & Naive Baselines
       │         ├── Predicts +24h, +48h, +72h Wholesale Price (LKR/kg) per Candidate Market
       │         └── Identifies Supply Glut / Crash Probability & Directional Trend
       │
       ├──► 5. Arbitrage & Safe-Margin Engine (Spring Boot Service)
       │         ├── Gross Revenue = Predicted_Price_LKR * Volume_kg
       │         ├── Transport Cost = Distance_km * 2 (Round-trip) * Fuel_Consumption_L_per_km * Fuel_Price_LKR + Handling_Fee
       │         ├── Net Profit = Gross Revenue - Transport Cost - Spoilage_Risk_Penalty
       │         └── Ranks all markets & generates natural-language "Primary Directive"
       ▼
[Returns Complete JSON Payload to Frontend Dashboard / Swagger UI]
```

## 4. Database Schema Specification (`db/init.sql`)

Agents scaffolding PostgreSQL must implement the following tables:

### 4.1 `markets`
Stores major Sri Lankan Dedicated Economic Centres (DECs) and wholesale markets.
- `id` (SERIAL PRIMARY KEY)
- `code` (VARCHAR(32) UNIQUE NOT NULL) — e.g., `DAMBULLA`, `PETTAH_COLOMBO`, `NUWARA_ELIYA`, `KEPPETIPOLA`, `MEEGODA`, `THAMBUTTEGAMA`, `JAFFNA`
- `name` (VARCHAR(100) NOT NULL)
- `province` (VARCHAR(64) NOT NULL)
- `latitude` (DECIMAL(9,6) NOT NULL)
- `longitude` (DECIMAL(9,6) NOT NULL)
- `handling_fee_per_kg_lkr` (DECIMAL(8,2) DEFAULT 2.50)

### 4.2 `crops`
- `id` (SERIAL PRIMARY KEY)
- `code` (VARCHAR(32) UNIQUE NOT NULL) — e.g., `TOMATO`, `CARROT`, `GREEN_CHILI`, `RED_ONION`, `CABBAGE`, `BRINJAL`
- `name` (VARCHAR(100) NOT NULL)
- `spoilage_rate_per_100km_pct` (DECIMAL(5,2) NOT NULL DEFAULT 1.50) — accounts for perishability during transit

### 4.3 `market_routes`
Pre-computed road distances and travel durations between origin regions/markets and destination markets.
- `id` (SERIAL PRIMARY KEY)
- `origin_code` (VARCHAR(32) NOT NULL)
- `destination_market_id` (INT REFERENCES `markets(id)`)
- `distance_km` (DECIMAL(7,2) NOT NULL)
- `estimated_duration_hours` (DECIMAL(5,2) NOT NULL)
- `road_terrain_factor` (DECIMAL(4,2) DEFAULT 1.00) — e.g., `1.25` for hill-country routes (Nuwara Eliya/Keppetipola)

### 4.4 `historical_prices`
Historical and live daily/weekly wholesale prices sourced from HDX and CROPIX.
- `id` (BIGSERIAL PRIMARY KEY)
- `market_id` (INT REFERENCES `markets(id)`)
- `crop_id` (INT REFERENCES `crops(id)`)
- `recorded_date` (DATE NOT NULL)
- `wholesale_price_lkr_per_kg` (DECIMAL(10,2) NOT NULL)
- `arrival_volume_tonnes` (DECIMAL(10,2))
- `source` (VARCHAR(32) DEFAULT 'HDX')
- UNIQUE(`market_id`, `crop_id`, `recorded_date`)

### 4.5 `weather_observations`
Regional weather telemetry from Open-Meteo / NASA POWER.
- `id` (BIGSERIAL PRIMARY KEY)
- `market_id` (INT REFERENCES `markets(id)`)
- `observation_date` (DATE NOT NULL)
- `precipitation_mm` (DECIMAL(6,2) NOT NULL)
- `temp_max_c` (DECIMAL(5,2))
- `temp_min_c` (DECIMAL(5,2))
- `extreme_weather_flag` (BOOLEAN DEFAULT FALSE)

### 4.6 `fuel_prices`
Tracks Sri Lanka CPC fuel prices (Lanka Auto Diesel / Petrol 92) for accurate transport cost modeling.
- `id` (SERIAL PRIMARY KEY)
- `effective_date` (DATE NOT NULL)
- `diesel_lkr_per_liter` (DECIMAL(8,2) NOT NULL) — e.g., `283.00`
- `petrol_lkr_per_liter` (DECIMAL(8,2) NOT NULL) — e.g., `311.00`

## 5. Machine Learning & Evaluation Specification (`ml-service/`)

### 5.1 Data Pipeline & Feature Engineering
1. **Primary Datasets:**
   - **HDX (Humanitarian Data Exchange):** WFP Sri Lanka Food Prices dataset (`sri-lanka-food-prices`) filtered/mapped to vegetable commodities and major markets, augmented with a realistic high-frequency daily synthetic/interpolated series where HDX is monthly.
   - **Weather API:** Open-Meteo Historical & 7-Day Forecast API (`https://api.open-meteo.com/v1/forecast`) and NASA POWER agroclimatology indicators (7-day cumulative rainfall in supply zones like Jaffna/Northern Province, Nuwara Eliya, Anuradhapura).
   - **CROPIX Scraper (`etl/cropix_scraper.py`):** Scraper with automatic fallback to `db/seed.sql` / local CSV snapshot so Risk 1 (sparse/offline government dashboards) never blocks execution.
2. **Engineered Features for 48h–72h Price Prediction:**
   - `price_lag_1d`, `price_lag_3d`, `price_lag_7d`, `price_lag_14d`
   - `rolling_mean_7d`, `rolling_std_7d` (volatility index)
   - `price_momentum_3d_pct` ($\frac{P_t - P_{t-3}}{P_{t-3}}$)
   - `supply_zone_rain_7d_mm` & `destination_rain_48h_forecast_mm`
   - `northern_harvest_glut_index` (seasonal/supply surge indicator)
   - `diesel_price_lkr`
   - `day_of_week`, `month`, `is_poya_or_festival_week`

### 5.2 Model Architecture & Baselines (Section 9 of Proposal)
- **Primary Model:** `XGBRegressor` (or `RandomForestRegressor` fallback) trained to predict `target_price_48h` and `target_price_72h`.
- **Mandatory Baselines (Must be computed and exposed in `/metrics` and evaluation reports):**
  1. **Naive Forecast Baseline:** $\hat{y}_{t+h} = y_t$ (assuming price in 48–72h equals today's price).
  2. **7-Day Moving Average Baseline:** $\hat{y}_{t+h} = \frac{1}{7}\sum_{i=0}^{6} y_{t-i}$.
- **Mandatory Evaluation Metrics:**
  1. **Directional Symmetry (DS):** Percentage of predictions where the predicted price change direction matches the actual price change direction:
     $$\text{DS} = \frac{100}{N} \sum_{t=1}^{N} \mathbb{I}\left( (y_{t+h} - y_t) \cdot (\hat{y}_{t+h} - y_t) > 0 \right)$$
  2. **Mean Absolute Error (MAE):**
     $$\text{MAE} = \frac{1}{N} \sum_{t=1}^{N} |y_{t+h} - \hat{y}_{t+h}|$$
  3. **Safe-Margin False Positive Rate (SM-FPR):** Rate at which the model recommends rerouting to a distant market that actually yields a lower net profit than staying at the local market. Target: `< 5%`.

### 5.3 Python ML Service REST API (`:8000`)
- `GET /health` → `{"status": "UP", "model_loaded": true, "model_version": "xgb-v1.0"}`
- `GET /metrics` → Returns JSON comparing XGBoost vs Naive Baseline vs 7-Day MA on `directional_symmetry_pct`, `mae_lkr`, and `safe_margin_fpr_pct`.
- `POST /predict-batch`:
  - **Request:**
    ```json
    {
      "crop_code": "TOMATO",
      "horizon_hours": 48,
      "reference_date": "2026-10-27",
      "markets": ["DAMBULLA", "PETTAH_COLOMBO", "KEPPETIPOLA", "MEEGODA"]
    }
    ```
  - **Response:**
    ```json
    {
      "crop_code": "TOMATO",
      "horizon_hours": 48,
      "predictions": [
        {
          "market_code": "DAMBULLA",
          "current_price_lkr": 220.0,
          "predicted_price_lkr": 154.0,
          "Baseline_naive_lkr": 220.0,
          "Baseline_ma7_lkr": 215.5,
          "pct_change": -30.0,
          "direction": "CRASH",
          "glut_risk_level": "HIGH",
          "confidence_score": 0.89,
          "primary_driver": "Supply glut from Northern province harvest + low local rain disruption"
        },
        {
          "market_code": "PETTAH_COLOMBO",
          "current_price_lkr": 260.0,
          "predicted_price_lkr": 275.0,
          "Baseline_naive_lkr": 260.0,
          "Baseline_ma7_lkr": 258.0,
          "pct_change": 5.77,
          "direction": "SURGE",
          "glut_risk_level": "LOW",
          "confidence_score": 0.86,
          "primary_driver": "High urban demand + constrained upcountry transport"
        }
      ]
    }
    ```

## 6. Core Production Backend Specification (`backend/` - Spring Boot `:8080`)

### 6.1 Transport & Net Profit Arbitrage Math (`ProfitMarginCalculator`)
Given:
- $Q$: Harvest volume in kg (e.g., `1000` kg)
- $P_{\text{pred}, m}$: Predicted wholesale price at market $m$ in LKR/kg
- $D_{o, m}$: One-way distance from farmer origin $o$ to market $m$ in km
- $T_{o, m}$: Terrain multiplier (`1.0` flat, `1.25` steep hill country)
- $\eta_v$: Vehicle fuel efficiency in liters/km:
  - `THREE_WHEELER` (300kg cap): `0.04` L/km (Petrol)
  - `MINI_TRUCK_BATTA` (1500kg cap): `0.08` L/km (Diesel)
  - `LORRY_3_5T` (3500kg cap): `0.14` L/km (Diesel)
- $F_v$: Current fuel price per liter (LKR)
- $S_c$: Crop spoilage rate per 100km (%)
- $H_m$: Market handling fee per kg (LKR)

Formulas:
1. $\text{Effective Sellable Volume } Q_{\text{eff}} = Q \times \left(1 - \frac{D_{o,m}}{100} \times \frac{S_c}{100}\right)$
2. $\text{Gross Revenue}_m = Q_{\text{eff}} \times P_{\text{pred}, m}$
3. $\text{Transport Fuel Cost}_m = (2 \times D_{o, m}) \times T_{o, m} \times \eta_v \times F_v \times \lceil Q / \text{VehicleCapacity} \rceil$
4. $\text{Handling Cost}_m = Q \times H_m$
5. $\text{Net Profit}_m = \text{Gross Revenue}_m - \text{Transport Fuel Cost}_m - \text{Handling Cost}_m$

### 6.2 Core REST API Endpoints (With OpenAPI / Swagger UI at `/swagger-ui.html`)
1. `GET /api/v1/metadata/config`
   - Returns list of supported crops, origin locations/markets, vehicle types, and current CPC fuel prices for the Onboarding Setup screen.
2. `POST /api/v1/directives/analyze`
   - Accepts farmer configuration:
     ```json
     {
       "origin_code": "ANURADHAPURA",
       "default_market_code": "DAMBULLA",
       "crop_code": "TOMATO",
       "quantity_kg": 1000,
       "vehicle_type": "MINI_TRUCK_BATTA",
       "horizon_hours": 48
     }
     ```
   - Returns:
     - `primary_directive`: Actionable headline, natural language explanation, alert severity (`CRITICAL_REROUTE`, `HOLD_HARVEST`, `PROCEED_DEFAULT`), percentage profit gain (`+15.4%`), and rupee gain.
     - `market_comparisons`: Array of all candidate markets ranked by `net_profit_lkr`, showing `current_price_lkr`, `predicted_price_lkr`, `gross_revenue_lkr`, `transport_cost_lkr`, `spoilage_loss_lkr`, `net_profit_lkr`, `distance_km`, and `is_recommended`.
     - `weather_alerts`: 48h–72h regional weather & glut alerts affecting supply routes.
     - `model_evaluation_summary`: Live DS (%) and MAE metrics vs Naive and 7-Day MA baselines.
3. `GET /api/v1/markets/{marketCode}/history?cropCode=TOMATO&days=30`
   - Returns 30-day historical prices + 48h/72h forecast trajectory for chart rendering.

## 7. Frontend Interface Specification (`frontend/` - React.js `:5173`)

Per Section 7.3 of the Proposal, the UI must feature a clean, high-contrast, farmer-and-trader-friendly dashboard:
1. **Onboarding & Scenario Configuration Bar (`OnboardingConfigModal.tsx`):**
   - Allows selecting Origin District/Town, Default Target Market (e.g., Dambulla), Crop (e.g., Tomato, Carrot, Green Chili), Harvest Volume (kg), Vehicle Type (Batta Mini-Truck, Lorry, Three-Wheeler), and Forecast Horizon (`48 Hours` / `72 Hours`).
   - Includes a **"Demo Preset: Northern Glut → Dambulla Crash"** one-click button that loads the exact scenario from the proposal so judges can verify the proposal scenario in one click.
2. **"Primary Directive" Hero Card (`PrimaryDirectiveCard.tsx`):**
   - Prominent status badge (`REROUTE RECOMMENDED` in amber/emerald or `SAFE TO PROCEED`).
   - Displays the exact directive text, predicted price drop at the default market (e.g., `-30%` at Dambulla), and net profit margin boost (`+15%` at Colombo Pettah after transport costs).
3. **Profit Margin Comparison Chart (`ProfitMarginChart.tsx`):**
   - Grouped bar chart comparing **Net Profit (LKR)** vs **Transport & Spoilage Cost (LKR)** across candidate markets (Colombo, Dambulla, Keppetipola, Meegoda, Jaffna).
   - Line chart tab showing 14-day historical price + 48h–72h XGBoost prediction vs 7-day Moving Average baseline.
4. **Weather Disruption & Supply Glut Alert Card (`WeatherDisruptionCard.tsx`):**
   - Shows regional rainfall anomalies, harvest glut warnings, and road/spoilage risk indicators.
5. **Routing & Logistics Panel (`RoutingLogisticsPanel.tsx`):**
   - Step-by-step table/cards detailing round-trip distance (km), fuel liters needed, CPC diesel cost, spoilage allowance, and net take-home payout per market.

## 8. Phased Execution Tasks for Autonomous Agents (Antigravity / Codex)

Agents working on this repository must execute the following workstreams in order. Each workstream is self-contained and has strict verification gates.

### Workstream 1: Foundation, Database & Data Pipeline (Phase 1)
- [ ] **Task 1.1:** Create root `.gitignore`, `.env.example`, and `docker-compose.yml` defining `postgres:16-alpine`, `ml-service`, `backend`, and `frontend`.
- [ ] **Task 1.2:** Write `db/init.sql` and `db/seed.sql` with realistic Sri Lankan market coordinates (Dambulla, Colombo Pettah, Nuwara Eliya, Keppetipola, Meegoda, Thambuttegama, Jaffna), inter-district distances, CPC fuel prices, and 180 days of historical price + weather records for `TOMATO`, `CARROT`, `GREEN_CHILI`, and `RED_ONION`.
- [ ] **Task 1.3:** Build Python ETL scripts (`ml-service/etl/`) for HDX CSV ingestion, Open-Meteo live API fetching, and CROPIX scraping with automatic local seed fallback.
- **Verification Gate 1:** Running `psql` or loading `init.sql` + `seed.sql` creates all 6 tables cleanly with >500 historical rows.

### Workstream 2: Python ML Training, Evaluation & FastAPI Inference (Phase 2)
- [ ] **Task 2.1:** Implement `ml-service/etl/feature_engineering.py` to compute lag features, rolling averages, weather anomalies, and supply glut indicators.
- [ ] **Task 2.2:** Implement `ml-service/training/train_model.py` and `evaluate.py` using `scikit-learn` and `xgboost`. Train the 48h and 72h price forecasting models and output `ml-service/models/evaluation_report.json` comparing XGBoost against the **Naive Forecast** and **7-Day Moving Average** on **Directional Symmetry (DS %)** and **MAE (LKR)**.
- [ ] **Task 2.3:** Implement FastAPI app (`ml-service/app/main.py`) exposing `/health`, `/metrics`, and `/predict-batch`.
- [ ] **Task 2.4:** Write `ml-service/tests/test_inference.py` and verify with `pytest`.
- **Verification Gate 2:** `pytest` passes; `POST /predict-batch` returns valid 48h–72h predictions with `directional_symmetry_pct > baseline_naive_ds` and sub-100ms response latency.

### Workstream 3: Java Spring Boot Core Backend & Swagger UI (Phase 1 & 3)
- [ ] **Task 3.1:** Scaffold Spring Boot 3.x project in `backend/` with `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `postgresql`, `springdoc-openapi-starter-webmvc-ui`, and `lombok` (optional).
- [ ] **Task 3.2:** Implement JPA entities, repositories, and `ProfitMarginCalculator` + `ArbitrageRoutingService` enforcing the Safe Margin Constraint.
- [ ] **Task 3.3:** Implement `MlServiceClient` with resilient circuit-breaking / fallback so if the Python service is unreachable during testing, Spring Boot still computes baseline forecasts gracefully.
- [ ] **Task 3.4:** Expose REST endpoints (`/api/v1/metadata/config`, `/api/v1/directives/analyze`, `/api/v1/markets/{code}/history`) and configure Swagger UI at `/swagger-ui.html`.
- [ ] **Task 3.5:** Write unit tests in `ArbitrageRoutingServiceTest.java` verifying that the Dambulla-to-Colombo reroute scenario yields the expected ~15% higher net profit margin after transport costs.
- **Verification Gate 3:** `mvn test` passes; `/swagger-ui.html` renders all endpoints and returns a complete directive payload.

### Workstream 4: React.js Intelligent Dashboard & End-to-End Integration (Phase 3 & 4)
- [ ] **Task 4.1:** Scaffold React + TypeScript + Vite + Tailwind CSS app inside `frontend/`.
- [ ] **Task 4.2:** Build `OnboardingConfigModal`, `PrimaryDirectiveCard`, `ProfitMarginChart`, `WeatherDisruptionCard`, and `RoutingLogisticsPanel`, plus a Model Evaluation badge showing DS & MAE vs Baselines.
- [ ] **Task 4.3:** Wire frontend to Spring Boot API (`/api/v1/directives/analyze`) and include an instant offline/demo fallback mode so the UI can also be previewed standalone.
- [ ] **Task 4.4:** Finalize root `README.md` with architecture diagrams, one-command Docker startup (`docker compose up --build`), local non-Docker run instructions, and sample curl/Swagger test payloads.
- **Verification Gate 4:** `npm run build` succeeds with zero TypeScript errors; full end-to-end flow renders the Primary Directive, Profit Margin Chart, Weather Disruption Alert, and Routing Logistics Panel.

# AGENTS.md — Instructions for Autonomous Coding Agents (Antigravity / Codex / Claude)

Welcome, Agent. You are operating on the **ATIE (Agricultural Trade & Intelligence Engine)** repository for **Team 404 Brain not found** (ModelX 2.0 Competition).

Before writing or modifying any code, read `IMPLEMENTATION_PLAN.md` and
`CONTRACTS.md` in the root directory. The plan is the source of truth for
architecture, schemas, API endpoints, and verification gates. `CONTRACTS.md`
is normative for cross-service calculations, thresholds, origin handling,
evaluation methodology, forecast-source labeling, and the canonical fixture.

## 1. Quick Context
- **Problem:** Smallholder farmers and informal traders in Sri Lanka sell produce at a loss due to localized supply gluts and regional price disparities.
- **Solution:** ATIE predicts wholesale crop prices **48 to 72 hours in advance** across major Sri Lankan markets (Dambulla, Colombo Pettah, Keppetipola, Nuwara Eliya, Meegoda, Jaffna) using historical price data (HDX/CROPIX), weather forecasts (Open-Meteo/NASA POWER), and CPC fuel/transport costs, outputting an actionable routing directive:
  > *"Do not send your tomatoes to the Dambulla market tomorrow; a supply glut from the Northern province is predicted to crash the price by 30%. Reroute to the Colombo market for a 15% higher profit margin after transport costs."*

## 2. Mandatory Technical Rules for Agents

### Rule 1: Follow the Exact Monorepo Structure
Do not invent alternative top-level folders. Use:
- `db/` — PostgreSQL DDL (`init.sql`) and seed data (`seed.sql`)
- `ml-service/` — Python 3.11+ FastAPI + XGBoost/RandomForest training, evaluation, and inference API (`:8000`)
- `backend/` — Java 17/21 Spring Boot 3.x Core REST API + Swagger UI (`:8080`)
- `frontend/` — React 18 + Vite + TypeScript + Tailwind CSS Dashboard (`:5173`)

### Rule 2: Enforce "Safe Margins" & Directional Accuracy (No Catastrophic False Positives)
- Never recommend a distant market based on gross wholesale price alone.
- Every recommendation MUST rank markets by **Net Profit (LKR)**:
  $$\text{Net Profit} = (\text{Effective Volume after Spoilage} \times \text{Predicted Price}) - \text{Round-Trip Fuel Cost} - \text{Market Handling Fee}$$
- Only trigger a `CRITICAL_REROUTE` directive if the alternative market beats the farmer's default market by at least a **5% net profit margin** after all transport and spoilage deductions.

### Rule 3: Always Include Evaluation Baselines
- Per Section 9 of the proposal, the ML pipeline MUST evaluate the model using:
  1. **Directional Symmetry (DS %)** — how often the model accurately predicts the direction of price movement (up/down/crash/surge).
  2. **Mean Absolute Error (MAE)** — LKR/kg error.
- Always compute and compare against two mandatory baselines:
  1. **Naive Forecast** ($\hat{y}_{t+h} = y_t$)
  2. **7-Day Historical Moving Average** ($\hat{y}_{t+h} = \text{MA}_7$)

### Rule 4: Resilient Data Fallbacks (Mitigating Risk 1)
- External government dashboards (CROPIX) or live weather APIs may rate-limit or fail during judging.
- Every scraper and external HTTP client (`cropix_scraper.py`, `weather_client.py`, `MlServiceClient.java`) MUST gracefully fall back to local seeded/cached data (`db/seed.sql` or `ml-service/data/`) without throwing unhandled 500 errors.

### Rule 5: Keep Code Modular & Boilerplate-Free (Mitigating Risk 2)
- In Spring Boot (`backend/`), use clean Java records for DTOs, constructor injection, and OpenAPI (`springdoc-openapi`) annotations so `/swagger-ui.html` works out of the box.
- Avoid circular dependencies, overly complex inheritance hierarchies, or unrequested authentication walls that block demo evaluation.

## 3. Agent Execution Prompt Templates

If you are invoked to build a specific component, execute the corresponding workstream from `IMPLEMENTATION_PLAN.md`:
- **To build the Database & Seed Data:** Execute **Workstream 1** (`db/init.sql`, `db/seed.sql`, `docker-compose.yml`).
- **To build the Python ML Engine:** Execute **Workstream 2** (`ml-service/` training, DS/MAE evaluation vs Naive & 7-day MA baselines, FastAPI `/predict-batch` & `/metrics`).
- **To build the Spring Boot Backend:** Execute **Workstream 3** (`backend/` entities, `ArbitrageRoutingService`, `ProfitMarginCalculator`, REST controllers, Swagger UI, JUnit tests).
- **To build the React Frontend:** Execute **Workstream 4** (`frontend/` Onboarding setup, Primary Directive Card, Profit Margin Comparison Chart, Weather Disruption Alert Card, Routing & Logistics Panel).

## 4. Definition of Done Checklist
Before marking any task complete, verify:
1. All unit/integration tests pass (`pytest` in `ml-service/`, `mvn test` in `backend/`, `npm run build` in `frontend/`).
2. The canonical proposal scenario (**1,000 kg Tomatoes from Northern/Anuradhapura corridor targeting Dambulla vs Colombo Pettah over a 48h–72h window**) reproduces the ~30% Dambulla glut crash warning and ~15% higher net profit margin in Colombo after transport costs.
3. Git status is clean and changes are committed with clear, atomic commit messages.

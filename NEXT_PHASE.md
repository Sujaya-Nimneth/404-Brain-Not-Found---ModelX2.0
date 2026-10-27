# ATIE Final Phase: Submission Closure

The four implementation workstreams and competition hardening are complete.
The remaining items below are production roadmap ideas, not submission
blockers.

## Completed In The Final Phase

- [x] Added the provenance-aware ingestion worker for HDX, Open-Meteo, and
  optional CROPIX.
- [x] Added `/api/v1/metadata/data-status` with source state, freshness, and
  market/crop coverage.
- [x] Added the dashboard provenance panel with explicit `LIVE`, `CACHED`,
  `SEED`, and `UNAVAILABLE` labels.
- [x] Added weather alert source and observation date.
- [x] Added optional API-key protection, disabled by default for judging.
- [x] Added `X-Request-ID` tracing, Actuator metrics, Nginx security headers,
  and the ingestion-worker heartbeat.
- [x] Cached ML features and batched warm inference; local warm inference is
  approximately 4.2 ms median in-process.
- [x] Added GitHub Actions CI for ML, backend, frontend, and Compose-backed
  Playwright verification.
- [x] Added and visually verified the final dashboard screenshot.
- [x] Added the technical report, two-page summary, and demo script.
- [x] Recorded and encoded the three-minute demo video.

## Submission Evidence

| Artifact | Location |
|---|---|
| Technical report PDF | `docs/submission/ATIE-Technical-Report.pdf` |
| Two-page summary PDF | `docs/submission/ATIE-Two-Page-Summary.pdf` |
| Demo script | `docs/submission/demo-script.md` |
| Demo video | `docs/evidence/atie-demo.mp4` |
| Dashboard capture | `docs/evidence/live-dashboard.png` |
| Evaluation report | `ml-service/models/evaluation_report.json` |

## Verified Acceptance Values

```text
Canonical request:
  origin: ANURADHAPURA
  default market: DAMBULLA
  crop: TOMATO
  quantity: 1000 kg
  vehicle: MINI_TRUCK_BATTA
  horizon: 48 hours
  demo_mode: true

forecast_source:      DEMO_FIXTURE
primary_directive:    CRITICAL_REROUTE
recommended market:   PETTAH_COLOMBO
profit_delta_lkr:     23238.58
profit_uplift_pct:    15.84
```

The same request with `demo_mode: false` returns `MODEL`,
`PROCEED_DEFAULT`, and seven market forecasts in the current verified state.

## Current Data Status

The verified snapshot is `PARTIAL`:

- Open-Meteo: `LIVE / CURRENT`
- WFP / HDX: `LIVE / STALE`; latest supported wholesale observation
  `2021-04-15`
- CROPIX: `UNAVAILABLE`

The trained model remains seed-backed. Live ingestion refreshes weather,
supported historical rows, and provenance; it does not retrain model weights
or relabel retail data as wholesale.

## Verification Gates

```bash
cd ml-service && python -m pytest -q
cd ../backend && mvn -q -Ppostgres-it \
  -Dnet.bytebuddy.experimental=true \
  -DATIE_TEST_DATABASE_URL=jdbc:postgresql://localhost:55432/atie \
  -DATIE_TEST_DATABASE_USERNAME=atie \
  -DATIE_TEST_DATABASE_PASSWORD=atie_dev_password test
cd ../frontend && npm run lint && npm run build
CI=true ATIE_E2E_URL=http://localhost:15173 npm run test:e2e
cd .. && docker compose --env-file .env.example config
docker compose --env-file .env.example ps
```

## Production Roadmap

- Add a supervised retraining pipeline with source freshness gates and a model
  registry.
- Add a CROPIX mapping adapter when a stable endpoint is available.
- Extend SM-FPR beyond the finite, versioned route matrix.
- Add farmer accounts, saved consignments, and notification delivery.
- Add a production authentication and secret-management layer.

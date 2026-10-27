# ATIE Next Phase: Competition Hardening

The four implementation workstreams are complete. The remaining work is
hardening and evidence collection rather than new architecture.

## Completed In This Phase

- [x] Market history is independent of the current wall-clock date.
- [x] History responses include chronological observations and 48h/72h model,
  naive, and MA7 trajectories.
- [x] Dashboard renders the historical and forecast comparison chart.
- [x] Onboarding options and thresholds load from `/api/v1/metadata/config`.
- [x] Origin changes filter default-market options by configured routes.
- [x] Failed live analysis remains visibly labeled as demo data.
- [x] Offline ML fallback covers all four crops, seven markets, and both
  horizons.
- [x] Cross-service tests cover the history and fallback contracts.

## Hardening Completed

- [x] Expand SM-FPR evaluation to five origins, two nearest alternatives per
  origin, four crops, three vehicle types, and four representative quantities.
- [x] Add a repeatable browser-level smoke test for the canonical demo and live
  model modes.
- [x] Record final demo evidence after rebuilding the Compose images with the
  latest commits: `docs/evidence/live-dashboard.png`.
- [x] Reduce the frontend's chart bundle through lazy loading.

## Verification Gates

```bash
cd ml-service && pytest
cd ../backend && mvn test
cd ../frontend && npm run lint && npm run build
cd ../frontend && npm run test:e2e
cd .. && docker compose up --build -d && docker compose ps
```

The canonical fixture must remain:

```text
forecast_source:      DEMO_FIXTURE
primary_directive:    CRITICAL_REROUTE
recommended market:   PETTAH_COLOMBO
profit_delta_lkr:     23238.58
profit_uplift_pct:    15.84
```

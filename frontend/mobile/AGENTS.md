# AGENTS.md — ATIE Android Mobile Client (`frontend/mobile/`)

Before modifying any code in `frontend/mobile/`, read root [`AGENTS.md`](../../AGENTS.md), [`CONTRACTS.md`](../../CONTRACTS.md), and [`IMPLEMENTATION_PLAN.md`](../../IMPLEMENTATION_PLAN.md).

## Mandatory Mobile Rules

1. **Android-Only Option A Integration:**
   - Keep this app strictly inside `frontend/mobile/` (`"platforms": ["android"]` in `app.json`) so the monorepo preserves its four top-level directories (`db/`, `ml-service/`, `backend/`, `frontend/`).
   - Never modify `frontend/Dockerfile`, `docker-compose.yml`, `backend/`, `ml-service/`, or `db/` for mobile-only changes.
2. **Share Normative Web Contracts Directly:**
   - Import canonical types, runtime contract validators, fixture data, and trajectory builders directly from `../../src/` (`types/atie.ts`, `api/mappers.ts`, `data/demoResponse.ts`, `components/trajectoryData.ts`).
   - Metro (`metro.config.js`) and TypeScript (`tsconfig.json`) are configured to watch and typecheck `../src`.
3. **Zero Client-Side Profit Fabrication:**
   - Never compute synthetic net profit, spoilage, or safe-margin directives on the mobile client.
   - Never relabel `DEMO_FIXTURE` or cached data as live `MODEL` output, and never substitute a cached response unless `findMatchingCachedResult` confirms exact consignment equality (`sameRequest`) with `forecastSource !== "DEMO_FIXTURE"`.
4. **Expo SDK 58 Tooling:**
   - Install Expo-compatible native dependencies with `npx expo install <package>`.
   - Navigation uses state-driven 4-tab layout in `App.tsx` (`Directive`, `Markets`, `Forecast`, `Trust & Live`) compatible out-of-the-box with Expo Go on Android.
5. **Verification Before Completion:**
   - `npm run typecheck` (`tsc --noEmit`)
   - `npm test` (`node --import tsx --test 'src/**/*.test.ts'`)
   - `npm run export:android` (`expo export --platform android`)

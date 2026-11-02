# ATIE Mobile — Android Field Client (Expo / React Native)

The official **Android** field client for **ATIE (Agricultural Trade & Intelligence Engine) — Team 404 Brain not found (ModelX 2.0)**, integrated via **Option A** inside `frontend/mobile/` so it shares the web dashboard's normative TypeScript contract layer (`frontend/src/types/atie.ts`, `frontend/src/api/mappers.ts`, `frontend/src/data/demoResponse.ts`, `frontend/src/components/trajectoryData.ts`) without duplicating profit math or modifying backend services.

---

## Architecture & Normative Contract Alignment

- **Monorepo Path:** `frontend/mobile/` (nested inside `frontend/`, isolated from the web Vite/Nginx Docker build via `frontend/.dockerignore` and `frontend/eslint.config.js`).
- **Target Platform:** Android (`"platforms": ["android"]`, package `com.modelx.atie`).
- **Endpoint Auto-Discovery:**
  1. Custom endpoint saved in the in-app **Server Endpoint** modal (`AsyncStorage`).
  2. `EXPO_PUBLIC_API_BASE_URL` environment variable (if set).
  3. Expo Go physical Android device on Wi-Fi LAN: auto-detects host LAN IP from Expo's `hostUri` and targets `http://<lan-ip>:15173/api/v1` (the frontend Nginx reverse proxy, preserving server-side `ATIE_API_KEY` injection), automatically falling back to `http://<lan-ip>:8080/api/v1` (direct Spring Boot API).
  4. Android Emulator (`AVD`): `http://10.0.2.2:15173/api/v1` with automatic `http://10.0.2.2:8080/api/v1` fallback.
- **Zero Fake Client Math (`CONTRACTS.md` §§2–7):** All net profit, spoilage, transport, `profit_delta_lkr`, `profit_uplift_pct`, and `CRITICAL_REROUTE` / `STAY_DEFAULT` / `HOLD_HARVEST` thresholds come strictly from the Spring Boot backend (or the explicitly badged `DEMO_FIXTURE` when `demo_mode: true`). Offline live failures retain a cached snapshot **only** when `sameRequest(cached.request, currentRequest)` matches and `forecastSource !== "DEMO_FIXTURE"`.

---

## Android Field UX Capabilities

1. **4-Tab Field Layout:**
   - **Directive:** Primary Directive decision card (`CRITICAL_REROUTE`, `STAY_DEFAULT`, `HOLD_HARVEST`), one-tap **WhatsApp / SMS / Android Share** dispatch slip, Net Profit comparison chart, and top weather alert callout.
   - **Setup:** Dynamic consignment onboarding hydrated from `GET /api/v1/metadata/config` (with offline seeded fallback):
     - **5 Origins:** Anuradhapura, Jaffna, Dambulla, Nuwara Eliya, Thambuttegama
     - **7 Destination Markets** (filtered dynamically by reachable routes): Dambulla DEC, Colombo Pettah, Meegoda DEC, Keppetipola DEC, Nuwara Eliya, Thambuttegama, Jaffna
     - **4 Seeded Crops:** Tomato, Carrot, Green Chili, Red Onion
     - **3 Vehicles:** Mini-Truck (Batta, 1,500 kg), Three-Wheeler (300 kg), 3.5t Lorry (3,500 kg)
     - **Horizons & Presets:** `48h` / `72h` horizons and `[300, 1000, 1500, 3500]` kg presets + custom quantity input
   - **Routes:** Ranked 7-market Route & Net Profit Ledger (`CRASH` / `STABLE` / `SURGE`, round-trip km, fuel litres, trips, gross revenue, transport, spoilage, handling fee) + native SVG **14-Day History & 48h/72h Forecast Trajectory** (`GET /api/v1/markets/{code}/history`).
   - **Intel:** Expandable Weather & Spoilage Risk panel, Live Data Provenance (`GET /api/v1/metadata/data-status`), and Holdout Model Evaluation (`DS %`, `MAE`, nullable `SM-FPR` vs Naive & 7-Day MA baselines).
2. **Trilingual Field Toggle (`EN` / `සිං` / `தமிழ்`):** Client-side English, Sinhala, and Tamil UI labels, market/origin/crop names, and localized WhatsApp/SMS driver dispatch slips persisted in `AsyncStorage`.

---

## Design Tokens

| Token | Hex | Role |
| :--- | :--- | :--- |
| **`canvas`** | `#f4f0e6` | Warm paper field background |
| **`cream`** | `#fffdf7` | Elevated card & control surface |
| **`ink`** | `#17251f` | High-contrast primary ink & dark header cards |
| **`moss`** | `#315c45` | Primary agricultural brand accent & `STAY_DEFAULT` state |
| **`leaf`** | `#5b8f63` | Supporting positive indicator accent |
| **`lime`** | `#d4e8a3` | High-contrast badge highlight on dark `ink` cards |
| **`clay`** | `#c7643b` | `CRITICAL_REROUTE` directive & `CRASH` alert accent |
| **`amber`** | `#d6a13f` | `HOLD_HARVEST` & `MEDIUM` weather caution accent |

---

## Getting Started (Android)

### 1. Install Dependencies
```bash
cd frontend/mobile
npm ci
```

### 2. Run on Android (Expo Go or Android Emulator)
Ensure the ATIE backend stack is running (`docker compose up -d` exposing `:15173` / `:8080`, or local Spring Boot on `:8080`).

```bash
# Start Metro and launch on connected Android device or Android Emulator
npm run android
```
- **Physical Android Phone (Expo Go):** Connect phone and dev machine to the same Wi-Fi LAN, scan the QR code in Expo Go. The app auto-detects the host LAN IP (`:15173` -> `:8080`), or tap the server icon in the top header to enter a custom URL.
- **Android Emulator:** Automatically connects via `http://10.0.2.2:15173/api/v1` (with `:8080` fallback).

### 3. Verification Gates
```bash
cd frontend/mobile
npm run typecheck
npm test
npm run export:android
```

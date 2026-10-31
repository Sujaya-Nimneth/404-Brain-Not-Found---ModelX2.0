# ATIE Mobile (React Native Expo)

The official cross-platform mobile client for **ATIE (Agricultural Trade & Intelligence Engine) ModelX 2.0**, designed to match the web application styling, design system, and wholesale consignment intelligence workflow.

---

## 🎨 Design System & Color Palette

The design properties directly replicate the web frontend (`frontend/tailwind.config.js` and `frontend/src/styles.css`):

| Token | Hex / Value | Description |
| :--- | :--- | :--- |
| **`canvas`** | `#f4f0e6` | Natural textured warm background |
| **`ink`** | `#17251f` | Deep primary typographic ink and dark badges |
| **`moss`** | `#315c45` | Primary agricultural brand tone, headers, and proceed state |
| **`leaf`** | `#5b8f63` | Sub-accent for icon accents, borders, and indicators |
| **`lime`** | `#d4e8a3` | High-visibility callout pills, hero highlights, and surge badges |
| **`clay`** | `#c7643b` | Terracotta warning, reroute actions, and price crash indicators |
| **`amber`** | `#d6a13f` | Cautionary warnings and harvest-hold states |
| **`cream`** | `#fffdf7` | Floating card backgrounds and input containers |

---

## 📦 Consignment Setup & Options

The mobile app includes all canonical options available in the web client:

- **Origins**: Anuradhapura, Jaffna, Dambulla, Nuwara Eliya, Thambuttegama
- **Target Markets**: Dambulla DEC, Colombo Pettah, Meegoda DEC, Keppetipola DEC, Nuwara Eliya, Thambuttegama
- **Produce Crops**: Tomato (තක්කාලි), Carrot (කැරට්), Green Chili (අමු මිරිස්), Red Onion (රතු ළුණු), Cabbage (ගෝවා), Leeks (ලීක්ස්)
- **Logistics Vehicles**:
  - Mini-Truck (Batta) — 1,500 kg
  - Three-Wheeler — 300 kg
  - 3.5 Tonne Lorry — 3,500 kg
- **Forecast Horizons**: 48 Hours & 72 Hours
- **Quantity Presets**: 500 kg, 1,000 kg, 2,500 kg, 5,000 kg + custom inputs
- **Modes**: Live server analysis with dynamic transport/spoilage calculation & 1-tap **Northern Glut Demo** scenario

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd mobile-frontend
npm install
```

### 2. Start Expo Development Server
```bash
npx expo start
```

### 3. Run on Target Platform
- **Expo Go (Physical Device)**: Scan the QR code displayed in the terminal with the Expo Go app (Android/iOS).
- **Android Emulator**: Press `a` in the terminal (or run `npm run android`).
- **iOS Simulator**: Press `i` in the terminal (macOS only, or run `npm run ios`).
- **Web Browser**: Press `w` in the terminal (or run `npm run web`).

# ATIE Demo Video Script

**Target length:** 2 minutes 45 seconds to 3 minutes  
**Audience:** ModelX 2.0 judges and technical reviewers  
**Format:** Screen recording with on-screen captions; voiceover optional

## Before Recording

1. Start the complete stack:

   ```bash
   cp .env.example .env
   docker compose up --build -d --wait
   docker compose --env-file .env.example ps
   ```

2. Confirm all five services are healthy.
3. Open `http://localhost:15173` at a 1280x720 browser viewport.
4. Keep the browser at 100% zoom.
5. Record the browser window, not the desktop, if possible.

## Storyboard

| Time | Picture | Caption / narration |
|---|---|---|
| 0:00-0:15 | ATIE title and top of dashboard | "Farmers do not need another price ticker. They need a safer routing decision." |
| 0:15-0:30 | Consignment setup panel | "Configure the origin, default market, crop, quantity, vehicle, and 48- or 72-hour horizon." |
| 0:30-0:50 | Load Northern glut demo | "The competition fixture is 1,000 kg of tomatoes from Anuradhapura to Dambulla." |
| 0:50-1:10 | Primary directive card | "Dambulla is forecast to crash by 30 percent. Colombo Pettah improves net profit by 15.84 percent, or LKR 23,238.58 after transport, spoilage, and handling." |
| 1:10-1:30 | Route ledger | "Every market is ranked by net profit, not gross price. The ledger exposes the full cost calculation." |
| 1:30-1:50 | Analyze market route | "Now disable the fixture and run normal model inference." |
| 1:50-2:10 | Live result | "The same request is not special-cased. The live engine returns seven market forecasts and a safety-gated directive based on the current model or fallback source." |
| 2:10-2:30 | Provenance and weather panels | "Weather is live and current. HDX is live but historical. CROPIX is unavailable. The UI never hides those differences." |
| 2:30-2:45 | Forecast trace, evaluation baselines, and footer | "The model is evaluated against naive and MA7 baselines. The visible SM-FPR counts how often a reroute would actually have reduced net profit." |
| 2:45-3:00 | Final card and repository | "ATIE: safe routing first. Full setup, contracts, tests, and evidence are in the repository." |

## Recording Steps

1. Hold on the initial dashboard for 12 seconds.
2. Scroll to the consignment setup and pause on the route controls.
3. Click **Load Northern glut demo**.
4. Hold on the `DEMO_FIXTURE` badge and the `CRITICAL_REROUTE` card.
5. Scroll slowly through the route ledger and profit chart.
6. Click **Analyze market route**.
7. Hold on the resulting `MODEL` or `FALLBACK` badge and the safety-gated
   directive card.
8. Scroll to the provenance panel and read the three source states.
9. Click **Show all 7 market alerts**, hold, then collapse.
10. Scroll to the forecast trace and end on the footer.

## Caption Rules

- Always say "fixture" when the source is `DEMO_FIXTURE`.
- Say "live model" only when the source is `MODEL`; say "deterministic
  fallback" when it is `FALLBACK`.
- Do not describe HDX as current; say "live source, historical observation".
- Do not describe CROPIX as working; say "unavailable".
- Do not claim the live ingestion retrains the model.

## Fallback Recording Plan

If a live external source fails during recording, keep the failure on screen.
The dashboard and provenance panel are designed to show the degraded state.
Do not edit the evidence to hide an unavailable source.

## Recording And Encoding

The repeatable browser recording is:

```bash
cd frontend
ATIE_E2E_URL=http://localhost:15173 npm run demo:record
```

That command writes the raw WebM to `docs/evidence/atie-demo.webm`. Convert it
to the checked-in MP4 with an ffmpeg build that includes libx264:

```bash
docker run --rm -v "$PWD/docs/evidence":/data \
  jrottenberg/ffmpeg:7.1-alpine -y -i /data/atie-demo.webm \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -movflags +faststart -an /data/atie-demo.mp4
```

The raw WebM is ignored because the MP4 is the submission artifact.

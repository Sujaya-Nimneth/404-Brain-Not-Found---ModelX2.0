import { chromium } from "@playwright/test";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const baseUrl = process.env.ATIE_E2E_URL ?? "http://localhost:15173";
const outputPath = path.resolve("../docs/evidence/atie-demo.webm");
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function setCaption(page, title, detail) {
  await page.evaluate(
    ({ title, detail }) => {
      let caption = document.getElementById("atie-demo-caption");
      if (!caption) {
        caption = document.createElement("div");
        caption.id = "atie-demo-caption";
        caption.style.cssText = [
          "position:fixed",
          "left:24px",
          "right:24px",
          "bottom:20px",
          "z-index:2147483647",
          "pointer-events:none",
          "display:flex",
          "gap:18px",
          "align-items:flex-start",
          "padding:16px 20px",
          "border:1px solid rgba(255,255,255,.22)",
          "border-radius:18px",
          "background:rgba(23,39,31,.93)",
          "box-shadow:0 18px 60px rgba(0,0,0,.24)",
          "color:#f6f1e7",
          "font-family:Georgia,serif",
          "backdrop-filter:blur(12px)",
        ].join(";");
        caption.innerHTML =
          '<strong id="atie-demo-caption-title" style="min-width:132px;color:#dce97a;font-size:13px;letter-spacing:.08em;text-transform:uppercase"></strong>' +
          '<span id="atie-demo-caption-detail" style="font-size:15px;line-height:1.45"></span>';
        document.body.append(caption);
      }
      document.getElementById("atie-demo-caption-title").textContent = title;
      document.getElementById("atie-demo-caption-detail").textContent = detail;
    },
    { title, detail },
  );
}

async function showOverlay(page, kind) {
  await page.evaluate((kind) => {
    const previous = document.getElementById("atie-demo-overlay");
    previous?.remove();
    const overlay = document.createElement("div");
    overlay.id = "atie-demo-overlay";
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483646",
      "display:grid",
      "place-items:center",
      "padding:48px",
      "background:radial-gradient(circle at 78% 18%,#dce8c7 0 18%,transparent 19%),linear-gradient(135deg,#f6f1e7,#edf1df 60%,#dce8c7)",
      "color:#17271f",
      "font-family:Georgia,serif",
      "text-align:center",
    ].join(";");
    const title = kind === "intro" ? "ATIE" : "Safe routing first.";
    const detail =
      kind === "intro"
        ? "Predict the price. Price the route. Protect the margin."
        : "The complete decision trail is in the repository.";
    const note =
      kind === "intro"
        ? "ModelX 2.0 / Team 404 Brain not found"
        : "48-72 hour forecasts / safe net-profit routing";
    overlay.innerHTML = `
      <div style="max-width:860px">
        <div style="font-size:76px;font-weight:700;letter-spacing:-.05em">${title}</div>
        <div style="margin-top:12px;color:#bd5e3b;font-size:23px;font-weight:700">${detail}</div>
        <div style="margin-top:18px;color:#66736b;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase">${note}</div>
      </div>
    `;
    document.body.append(overlay);
  }, kind);
}

async function hideOverlay(page) {
  await page.evaluate(() => {
    const overlay = document.getElementById("atie-demo-overlay");
    if (!overlay) return;
    overlay.style.transition = "opacity .7s ease";
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 800);
  });
  await sleep(900);
}

async function hideCaption(page) {
  await page.evaluate(() => {
    document.getElementById("atie-demo-caption")?.remove();
  });
}

async function scrollTo(page, locator) {
  await locator.evaluate((element) =>
    element.scrollIntoView({ behavior: "smooth", block: "center" }),
  );
  await sleep(1_400);
}

const browser = await chromium.launch({ headless: true });
const videoDir = await mkdtemp(path.join(tmpdir(), "atie-demo-"));
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  colorScheme: "light",
});
const page = await context.newPage();

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await showOverlay(page, "intro");
  await sleep(10_000);
  await hideOverlay(page);

  await setCaption(
    page,
    "01 / The problem",
    "A higher market price can still lose money after transport, spoilage, and handling.",
  );
  await sleep(12_000);

  const setup = page.getByRole("heading", {
    name: "Tell us what is leaving the farm.",
  });
  await scrollTo(page, setup);
  await setCaption(
    page,
    "02 / Configure",
    "Origin, default market, crop, quantity, vehicle, and 48- or 72-hour horizon.",
  );
  await sleep(12_000);

  await page.getByRole("button", { name: "Load Northern glut demo" }).click();
  await page.getByText("DEMO FIXTURE").first().waitFor({ state: "visible" });
  await setCaption(
    page,
    "03 / Canonical fixture",
    "1,000 kg of tomatoes from Anuradhapura. Dambulla is the default market.",
  );
  await sleep(15_000);

  const directive = page.getByRole("heading", {
    name: "Reroute to Colombo Pettah",
  });
  await scrollTo(page, directive);
  await setCaption(
    page,
    "04 / Safe reroute",
    "Dambulla is forecast to crash by 30%. Pettah improves net profit by 15.84% and LKR 23,238.58.",
  );
  await sleep(18_000);

  const ledger = page.getByRole("heading", { name: "Every rupee accounted for." });
  await scrollTo(page, ledger);
  await setCaption(
    page,
    "05 / Full ledger",
    "Every reachable market is ranked by net profit after fuel, terrain, spoilage, and handling.",
  );
  await sleep(15_000);

  await scrollTo(page, page.getByRole("button", { name: "Analyze market route" }));
  await setCaption(
    page,
    "06 / Live model",
    "Disable the fixture and run the same consignment through normal model inference.",
  );
  await page.getByRole("button", { name: "Analyze market route" }).click();
  await page
    .getByText(/^(CRITICAL REROUTE|PROCEED DEFAULT|HOLD HARVEST)$/)
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  await sleep(3_000);

  const liveDirective = page
    .getByText(/^(CRITICAL REROUTE|PROCEED DEFAULT|HOLD HARVEST)$/)
    .first();
  await scrollTo(page, liveDirective);
  await setCaption(
    page,
    "07 / Live result",
    "Normal inference returns every reachable market and a safety-gated directive. The fixture is not special-cased.",
  );
  await sleep(16_000);

  await scrollTo(page, page.getByRole("heading", { name: "Live where it can be." }));
  await setCaption(
    page,
    "08 / Data provenance",
    "Open-Meteo is live and current. HDX is live but historical. CROPIX is visibly unavailable.",
  );
  await sleep(16_000);

  const showAll = page.getByRole("button", {
    name: "Show all 7 market alerts",
  });
  await scrollTo(page, showAll);
  await setCaption(
    page,
    "09 / Weather context",
    "Weather is shown with its source and observation date. Expand to inspect every market.",
  );
  await showAll.click();
  await sleep(9_000);
  await page
    .getByRole("button", { name: "Show highest-risk markets" })
    .click();

  await scrollTo(
    page,
    page.getByRole("heading", { name: "History meets the horizon." }),
  );
  await setCaption(
    page,
    "10 / Forecast trace",
    "Historical observations meet the model, naive, and seven-day moving-average forecasts.",
  );
  await sleep(16_000);

  await hideCaption(page);
  await showOverlay(page, "outro");
  await sleep(12_000);
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  const recordedPath = await video.path();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await copyFile(recordedPath, outputPath);
  await rm(videoDir, { recursive: true, force: true });
  console.log(outputPath);
}

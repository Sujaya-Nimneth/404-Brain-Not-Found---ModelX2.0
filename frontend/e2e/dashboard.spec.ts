import { expect, test } from "@playwright/test";

test("renders the canonical fixture and switches to live model output", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Reroute to Colombo Pettah" }),
  ).toBeVisible();
  await expect(page.getByText("DEMO FIXTURE").first()).toBeVisible();
  await expect(page.getByText("23,239")).toBeVisible();
  await expect(page.getByText("15.84%").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Live where it can be." }),
  ).toBeVisible();
  await expect(page.getByText(/Data provenance/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Load Northern glut demo" }).click();
  await expect(page.getByText("DEMO FIXTURE").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reroute to Colombo Pettah" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Analyze market route" }).click();

  const liveSource = page.getByText(/^(MODEL|FALLBACK)$/).first();
  await expect(liveSource).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText(/^(CRITICAL REROUTE|PROCEED DEFAULT|HOLD HARVEST)$/).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/^INPUTS (LIVE|CACHED|SEED)$/).first(),
  ).toBeVisible();
  await expect(page.getByText("Showing verified demo fixture")).not.toBeVisible();
  await expect(page.getByText("DEMO FIXTURE").first()).not.toBeVisible();

  const routeSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Every rupee accounted for." }),
  });
  await expect(routeSection.getByRole("table").locator("tbody tr")).toHaveCount(
    7,
  );
  await expect(
    page.getByRole("img", { name: /Historical and forecast prices/ }),
  ).toBeVisible();
  await expect(page.getByText(/observed days · 2 forecast horizons/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("heading", { name: "Accuracy is not the only safety test." }),
  ).toBeVisible();
  await expect(page.getByText("Naive persistence")).toBeVisible();
  await expect(page.getByText("7-day moving average")).toBeVisible();

  await page.screenshot({
    path: "../docs/evidence/live-dashboard.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "Show all 7 market alerts" }).click();
  await expect(
    page.getByRole("button", { name: "Show highest-risk markets" }),
  ).toBeVisible();
});

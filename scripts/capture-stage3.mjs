// Captures the stage-3 review screenshots from the static export served at
// http://127.0.0.1:4173/aurora/ (run `node scripts/serve-static.mjs` first).
// The sandbox cannot reach OpenFreeMap, so the basemap is stubbed (no tiles).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = "http://127.0.0.1:4173/aurora/";
const out = "docs/visual-reviews/stage-3";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});

async function stubMap(page) {
  await page.route("https://tiles.openfreemap.org/**", (route) => {
    if (route.request().url().includes("/styles/"))
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          version: 8,
          glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
          sources: {},
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#0b1020" },
            },
          ],
        }),
      });
    return route.fulfill({ status: 404, body: "" });
  });
}

async function pickDates(page, gap = 2) {
  const days = page.locator(".calendar-day");
  for (let month = 0; month < 4; month++) {
    const total = await days.count();
    for (let i = 0; i + gap < total; i++) {
      if (await days.nth(i).isDisabled()) continue;
      await days.nth(i).click();
      if (!(await days.nth(i + gap).isDisabled())) {
        await days.nth(i + gap).click();
        return;
      }
    }
    await page
      .getByRole("button", {
        name: /Next month|Następny miesiąc|Наступний місяць/,
      })
      .click();
  }
  throw new Error("no bookable range found");
}

// 1. Catalogue with distinct covers, then with favourites (desktop 1440).
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await stubMap(page);
  await page.goto(`${base}stays/`);
  await page.locator(".stay-photo img").first().waitFor();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/catalogue-1440.png` });
  for (const slug of ["halny-ridge", "gorce-meadow", "smerekova-a-frame"])
    await page.getByTestId(`fav-${slug}`).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/catalogue-1440-favourites.png` });
  // Account with favourites and no bookings yet.
  await page.goto(`${base}account/`);
  await page.getByTestId("favourites").waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/account-favourites-1440.png` });
  await context.close();
}

// 2. Phone 390: catalogue, then booking confirmation (EN and PL) and account.
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await stubMap(page);
  await page.goto(`${base}stays/`);
  await page.locator(".stay-photo img").first().waitFor();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/catalogue-390.png` });

  for (const locale of ["en", "pl"]) {
    await page.goto(`${base}stays/halny-ridge/`);
    if (locale !== "en")
      await page.getByLabel("Language", { exact: true }).selectOption(locale);
    await page.locator(".calendar-day").first().waitFor();
    await pickDates(page);
    await page.locator(".booking .btn-cta").first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.locator("input").first().fill("Test Guest");
    await dialog.locator("input").nth(1).fill("4242 4242 4242 4242");
    await dialog.locator("button[type=submit]").click();
    await page.getByTestId("booking-ref").waitFor();
    await page.waitForTimeout(450); // confetti mid-flight
    await page.screenshot({ path: `${out}/confirmation-390-${locale}-confetti.png` });
    await page.waitForTimeout(2500);
    await page.locator(".email-preview").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/confirmation-390-${locale}-email.png` });
    await dialog.locator("button.btn-ghost").last().click();
  }
  await page.goto(`${base}account/`);
  await page.locator(".account-card").first().waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/account-390.png`, fullPage: true });
  await context.close();
}

await browser.close();
console.log("done");

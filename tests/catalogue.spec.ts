import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

import { stubMapTiles } from "./support/map-stub";

const out = "qa/screenshots/stage-2";
const regions = [
  ["carpathians", "Carpathian Mountains"],
  ["tatras", "The Tatra Mountains"],
  ["adriatic", "Adriatic Coast"],
  ["julian-alps", "Julian Alps"],
] as const;

async function count(page: Page) {
  return Number(
    await page.getByTestId("results-count").locator("strong").textContent(),
  );
}

async function waitForMap(page: Page) {
  await page.waitForFunction(
    () => {
      const m = (window as Window & { __auroraMap?: { loaded(): boolean } })
        .__auroraMap;
      return !!m && m.loaded();
    },
    null,
    { timeout: 30_000 },
  );
}

test.beforeEach(async ({ page }) => {
  await stubMapTiles(page);
});

test("every globe region opens a non-empty, filtered catalogue", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [id, name] of regions) {
    await page.goto(`stays/?region=${id}`);
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => count(page)).toBeLessThan(10);
    expect(await count(page)).toBeGreaterThan(0);
    for (const label of await page.locator(".stay-region").allTextContents())
      expect(label.toLowerCase()).toContain(
        name.replace("The ", "").toLowerCase().split(" ")[0],
      );
  }
  // The hero dialog links straight into the filtered catalogue.
  await page.goto("");
  await page.locator(".regions button").nth(3).click();
  await page.getByRole("button", { name: "Explore the region" }).click();
  await page.getByRole("link", { name: /See stays in this region/ }).click();
  await expect(page).toHaveURL(/stays\/\?region=julian-alps/);
  // Static HTML lists everything; the URL filter applies right after hydration.
  await expect.poll(() => count(page)).toBe(2);
});

test("filters combine, sync to the URL and reset", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("stays/");
  expect(await count(page)).toBe(10);
  await page.getByRole("button", { name: "+" }).click();
  await page.getByRole("button", { name: "+" }).click();
  await page.getByRole("button", { name: "+" }).click();
  await page.getByLabel("Cabin", { exact: true }).check();
  await page.getByRole("button", { name: "Sauna", exact: true }).click();
  expect(await count(page)).toBe(2);
  await expect(page).toHaveURL(/guests=4/);
  await expect(page).toHaveURL(/type=cabin/);
  await expect(page).toHaveURL(/amenities=sauna/);
  // A shared URL restores the same state.
  await page.reload();
  await expect.poll(() => count(page)).toBe(2);
  await page.getByRole("button", { name: "Reset filters" }).click();
  expect(await count(page)).toBe(10);
  await page.locator(".filter-price input").fill("100");
  expect(await count(page)).toBe(2);
  await page.getByLabel("Sort").selectOption("price-desc");
  await expect(page.locator(".stay-card h2").first()).toHaveText(
    "Pine Cove Pods",
  );
});

test("map and list stay in sync on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("stays/?region=tatras");
  await waitForMap(page);
  await page.locator(".stays-map").scrollIntoViewIfNeeded();
  // Click the pin of a stay → its card is highlighted.
  const point = await page.evaluate(() => {
    const m = (
      window as Window & {
        __auroraMap?: {
          project(c: [number, number]): { x: number; y: number };
          getCanvas(): HTMLCanvasElement;
        };
      }
    ).__auroraMap!;
    const p = m.project([20.142, 49.548]);
    const r = m.getCanvas().getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(".stay-card.is-active h2")).toHaveText(
    "Gorce Meadow",
  );
  // "Search in map area": zooming far into one stay narrows the list.
  await page.getByLabel("Show only stays in the map area").check();
  await page.evaluate(() => {
    const m = (
      window as Window & {
        __auroraMap?: {
          jumpTo(o: { center: [number, number]; zoom: number }): void;
        };
      }
    ).__auroraMap!;
    m.jumpTo({ center: [19.952, 49.296], zoom: 12 });
  });
  await expect.poll(() => count(page)).toBe(1);
  await mkdir(out, { recursive: true });
});

test("phone 360: list/map toggle, no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("stays/");
  await expect(page.locator(".stays-map")).toBeHidden();
  await expect(page.locator(".stay-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Map/ }).click();
  await waitForMap(page);
  await expect(page.locator(".stays-map")).toBeVisible();
  await expect(page.locator(".stays-list")).toBeHidden();
  await expect(page).toHaveURL(/view=map/);
  await page.getByRole("button", { name: /List/ }).click();
  await expect(page.locator(".stays-list")).toBeVisible();
});

test("property page: gallery lightbox, facts, structured data", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("stays/");
  await page.getByRole("link", { name: /Halny Ridge/ }).click();
  await expect(page).toHaveURL(/stays\/halny-ridge\/$/);
  await expect(page.locator("h1")).toHaveText("Halny Ridge");
  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}",
  );
  expect(jsonLd["@type"]).toBe("LodgingBusiness");
  expect(jsonLd.name).toContain("fictional");
  const first = page.locator(".gallery-item").first();
  await first.click();
  const lightbox = page.locator("dialog.lightbox");
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator("figcaption")).toContainText("1 / 4");
  await page.keyboard.press("ArrowRight");
  await expect(lightbox.locator("figcaption")).toContainText("2 / 4");
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(first).toBeFocused();
  // Every gallery image actually loads.
  for (const img of await page.locator(".gallery-item img").all())
    expect(
      await img.evaluate((i) => (i as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
  await expect(page.locator(".price-card")).toContainText("€165");
  await page.getByLabel("Language", { exact: true }).selectOption("pl");
  await expect(page.locator(".breadcrumb")).toContainText("Noclegi");
});

test("catalogue screenshots (map basemap stubbed offline)", async ({
  browser,
}) => {
  await mkdir(out, { recursive: true });
  const shots = [
    { name: "catalogue-1440", w: 1440, h: 1000, dpr: 1, map: false },
    { name: "catalogue-390-list", w: 390, h: 844, dpr: 3, map: false },
    { name: "catalogue-390-map", w: 390, h: 844, dpr: 3, map: true },
  ];
  for (const s of shots) {
    const context = await browser.newContext({
      viewport: { width: s.w, height: s.h },
      deviceScaleFactor: s.dpr,
    });
    const page = await context.newPage();
    await stubMapTiles(page);
    await page.goto(s.map ? "stays/?view=map" : "stays/");
    if (s.w > 1000 || s.map) await waitForMap(page);
    if (s.w > 1000) await page.evaluate(() => window.scrollTo(0, 520));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${s.name}-offline-map.png` });
    await context.close();
  }
});

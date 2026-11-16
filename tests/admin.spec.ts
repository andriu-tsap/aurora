import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import type { Booking } from "../packages/types/src/index";
import { gradientPng } from "./support/png";

/**
 * Owner panel (Angular, demo mode) served at /aurora/admin/ with hash routes.
 * No WebGL, no network: everything lives in localStorage / sessionStorage.
 */
const SLUG = "halny-ridge";

test.beforeEach(async ({ page }) => {
  // Freeze "today" (Date only, timers keep running) so the calendar opens on a known month.
  await page.clock.setFixedTime(new Date("2026-11-16T12:00:00Z"));
});

async function signIn(page: Page): Promise<void> {
  await page.goto("admin/");
  await page.getByTestId("demo-login").click();
  await expect(page.getByTestId("property-list")).toBeVisible();
}

test("demo login shows the Demo data badge before and after signing in", async ({
  page,
}) => {
  await page.goto("admin/");
  await expect(page).toHaveURL(/admin\/#\/login/);
  await expect(page.getByTestId("demo-badge")).toBeVisible();
  await expect(page.getByTestId("demo-badge")).toContainText("Demo data");
  await page.getByTestId("demo-login").click();
  await expect(page).toHaveURL(/admin\/#\/properties/);
  await expect(page.getByTestId("demo-badge")).toBeVisible();
  await expect(
    page.getByTestId("property-list").locator("li").first(),
  ).toBeVisible();
});

test("price change persists after reload and Reset restores the original", async ({
  page,
}) => {
  await signIn(page);
  const row = page.locator(`[data-slug="${SLUG}"]`);
  const input = row.locator(`#price-${SLUG}`);
  const original = await input.inputValue();
  const changed = String(Number(original) + 37);

  await input.fill(changed);
  await row.getByRole("button", { name: "Save", exact: true }).click();
  await expect(row.getByRole("status")).toContainText("Price saved");

  await page.reload();
  await expect(input).toHaveValue(changed);
  await expect(row.getByText("Edited")).toBeVisible();

  await row.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(input).toHaveValue(original);
  await expect(row.getByText("Edited")).toHaveCount(0);
  await page.reload();
  await expect(input).toHaveValue(original);
});

test("create a property with a photo, it persists, then delete it with confirmation", async ({
  page,
}) => {
  await signIn(page);
  await page.getByTestId("add-property").click();
  await expect(page).toHaveURL(/#\/properties\/new/);

  await page.locator("#f-name").fill("Test Cabin E2E");
  await page.locator("#f-guests").fill("4");
  await page.locator("#f-nightly").fill("125");
  await page.locator("#f-cleaning").fill("30");
  await page.locator("#f-weekly").fill("5");
  await page.locator("#f-min").fill("2");
  await page.getByTestId("photo-input").setInputFiles({
    name: "cabin.png",
    mimeType: "image/png",
    buffer: gradientPng(),
  });
  await expect(page.getByTestId("photo-list").locator("li")).toHaveCount(1);
  await page.getByTestId("save-stay").click();

  await expect(page).toHaveURL(/#\/properties$/);
  const row = page.locator(".row", { hasText: "Test Cabin E2E" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Added by you")).toBeVisible();
  await expect(row.locator("img.thumb")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );

  await page.reload();
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: /Edit/ }).click();
  await expect(page.getByTestId("photo-list").locator("li")).toHaveCount(1);

  await page.getByRole("button", { name: "Delete property" }).click();
  await expect(page.getByRole("group", { name: /Delete this property/ })).toBeVisible();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/#\/properties$/);
  await expect(page.locator(".row", { hasText: "Test Cabin E2E" })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.locator(".row", { hasText: "Test Cabin E2E" })).toHaveCount(
    0,
  );
});

test("invalid form shows errors in an alert and focuses the first invalid field", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("admin/#/properties/new");
  await expect(page.getByTestId("stay-form")).toBeVisible();

  // Empty name is the first invalid field.
  await page.getByTestId("save-stay").click();
  await expect(page.getByRole("alert")).toContainText(
    "Please fix the highlighted fields.",
  );
  await expect(page.locator("#f-name")).toBeFocused();
  await expect(page.locator("#f-name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#e-name")).toContainText("Enter 2–80 characters.");

  // A valid name moves the focus on to the next invalid field (guests).
  await page.locator("#f-name").fill("Valid Name");
  await page.locator("#f-guests").fill("99");
  await page.getByTestId("save-stay").click();
  await expect(page.locator("#f-guests")).toBeFocused();
  await expect(page.locator("#f-guests")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#f-name")).not.toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/#\/properties\/new/);
});

test("occupancy calendar: keyboard navigation and a guest booking is counted as guest", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("admin/#/occupancy");
  const grid = page.getByTestId("cal-grid");
  await page.getByTestId("cal-property").selectOption(SLUG);
  await expect(page.getByTestId("cal-month")).toContainText("November 2026");
  await expect(page.getByTestId("cal-summary")).toContainText("0 guest");

  // Roving tabindex: the day for "today" is the single tab stop.
  const stop = grid.locator('td[tabindex="0"]');
  await expect(stop).toHaveCount(1);
  await expect(stop).toHaveAttribute("data-date", "2026-11-16");
  await stop.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(":focus")).toHaveAttribute("data-date", "2026-11-17");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(":focus")).toHaveAttribute("data-date", "2026-11-24");
  await page.keyboard.press("PageDown");
  await expect(page.getByTestId("cal-month")).toContainText("December 2026");
  await expect(page.locator(":focus")).toHaveAttribute("data-date", "2026-12-24");
  await page.keyboard.press("PageUp");
  await expect(page.getByTestId("cal-month")).toContainText("November 2026");

  // A booking made on the public site (same origin) is read from localStorage.
  const booking: Booking = {
    reference: "AUR-E2E001",
    slug: SLUG,
    stayName: "Halny Ridge",
    guestName: "Test Guest",
    checkIn: "2026-11-10",
    checkOut: "2026-11-13",
    guests: 2,
    nights: 3,
    totalCents: 45000,
    status: "confirmed",
    createdAt: "2026-11-01T10:00:00.000Z",
  };
  await page.evaluate((value) => {
    localStorage.setItem("aurora-bookings", JSON.stringify([value]));
  }, booking);
  await page.reload();
  await page.getByTestId("cal-property").selectOption(SLUG);
  await expect(page.getByTestId("cal-summary")).toContainText("3 guest");
  await expect(grid.locator('td[data-state="guest"]')).toHaveCount(3);
  await expect(grid.locator('td[data-date="2026-11-10"]')).toHaveAttribute(
    "data-state",
    "guest",
  );
  await expect(grid.locator('td[data-date="2026-11-13"]')).not.toHaveAttribute(
    "data-state",
    "guest",
  );

  // Another property is not affected by this booking.
  await page.getByTestId("cal-property").selectOption("gorce-meadow");
  await expect(page.getByTestId("cal-summary")).toContainText("0 guest");
});

test("CSV export downloads a file named aurora-demo-revenue", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("admin/#/occupancy");
  await expect(page.getByTestId("revenue-table")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-csv").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("aurora-demo-revenue");
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  await expect(page.getByTestId("export-status")).toHaveAttribute(
    "data-kind",
    "done",
  );
  const path = await download.path();
  const text = await readFile(path, "utf8");
  expect(text).toContain("Demo data (fictional)");
});

test("EN / PL / UA switch in the header changes the language", async ({
  page,
}) => {
  await page.goto("admin/");
  const select = page.locator("header select");
  await expect(page.getByTestId("demo-badge")).toContainText("Demo data");

  await select.selectOption("pl");
  await expect(page.getByTestId("demo-badge")).toContainText("Dane demo");
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");

  await select.selectOption("uk");
  await expect(page.getByTestId("demo-badge")).toContainText("Демо-дані");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  expect(await page.evaluate(() => localStorage.getItem("aurora-locale"))).toBe(
    "uk",
  );

  // The choice survives sign-in and a reload.
  await page.getByTestId("demo-login").click();
  await expect(page.getByTestId("property-list")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("demo-badge")).toContainText("Демо-дані");

  await select.selectOption("en");
  await expect(page.getByTestId("demo-badge")).toContainText("Demo data");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("at 390 px the page does not scroll horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const routes: { hash: string; ready: string }[] = [
    { hash: "properties", ready: "property-list" },
    { hash: "properties/new", ready: "stay-form" },
    { hash: "occupancy", ready: "revenue-table" },
  ];
  for (const { hash, ready } of routes) {
    await page.goto(`admin/#/${hash}`);
    await expect(page.getByTestId(ready)).toBeVisible();
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflow.scroll, `#/${hash}`).toBeLessThanOrEqual(overflow.client);
  }
});

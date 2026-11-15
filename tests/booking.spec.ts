import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

import { stubMapTiles } from "./support/map-stub";

const out = "qa/screenshots/stage-3";

test.beforeEach(async ({ page }) => {
  await stubMapTiles(page);
});

/** Picks a check-in and a check-out `gap` days later in the visible calendar. */
async function pickDates(page: Page, gap = 2) {
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
    await page.getByRole("button", { name: "Next month" }).click();
  }
  throw new Error("no bookable range found");
}

async function openStay(page: Page) {
  await page.goto("stays/halny-ridge/");
  await expect(page.locator(".calendar-day").first()).toBeVisible();
}

test("book with a test card, keep only the result, download a PDF voucher", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStay(page);
  await pickDates(page);
  await expect(page.locator(".quote-total dd")).toBeVisible();
  await page.getByRole("button", { name: "Reserve" }).click();

  const dialog = page.getByRole("dialog", { name: "Demo payment" });
  await expect(dialog.getByRole("note")).toContainText(
    "Demo payment — no real card is charged",
  );
  await dialog.getByLabel("Guest name").fill("Test Guest");

  const confirm = dialog.getByRole("button", { name: "Confirm demo booking" });
  await dialog.getByLabel("Test card number").fill("4111 1111 1111 1111");
  await confirm.click();
  await expect(dialog.getByRole("alert")).toHaveText("Use a test card number");

  await dialog.getByLabel("Test card number").fill("4000 0000 0000 0002");
  await confirm.click();
  await expect(dialog.getByRole("alert")).toContainText("Card declined");

  await dialog.getByLabel("Test card number").fill("4242 4242 4242 4242");
  await page.screenshot({ path: `${out}/booking-1440-payment.png` });
  await confirm.click();
  const ref = (await page.getByTestId("booking-ref").textContent()) ?? "";
  expect(ref).toMatch(/^AUR-[0-9A-Z]{6}$/);
  await expect(dialog).toContainText("demo: in production");

  // Only the booking result is persisted — never any card digits.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("aurora-bookings"),
  );
  expect(stored).toContain(ref);
  expect(stored).not.toContain("4242");
  expect(stored).not.toContain("4000");
  const keys = await page.evaluate(() => Object.keys(window.localStorage));
  for (const k of keys) {
    const v = (await page.evaluate((key) => window.localStorage.getItem(key), k)) ?? "";
    expect(v).not.toContain("4242");
  }

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "Download PDF voucher" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`aurora-voucher-${ref}.pdf`);
  await download.saveAs(`${out}/voucher-sample.pdf`);
  const path = await download.path();
  const bytes = await readFile(path);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(10_000);

  // Guest account lists the booking and can cancel it.
  await dialog.getByRole("link", { name: "Open my bookings" }).click();
  await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
  const card = page.locator(".account-card", { hasText: ref });
  await expect(card).toContainText("Confirmed");
  await page.screenshot({ path: `${out}/account-1440.png` });
  await card.getByRole("button", { name: "Cancel booking" }).click();
  await expect(card).toContainText("Cancelled");
  await page.reload();
  await expect(page.locator(".account-card", { hasText: ref })).toContainText(
    "Cancelled",
  );
});

test("unavailable nights cannot be selected across and an empty account is honest", async ({
  page,
}) => {
  await page.goto("account/");
  await expect(page.getByText("No demo bookings yet.")).toBeVisible();
  await expect(page.getByText("Demo: bookings are stored only")).toBeVisible();

  await openStay(page);
  const busy = page.locator(".calendar-day.is-busy");
  await expect(busy.first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reserve" })).toBeDisabled();
});

test("phone 390: booking panel fits, calendar and dialog usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStay(page);
  await pickDates(page);
  await expect(page.locator(".quote-total dd")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator(".booking").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/booking-390.png` });
  await page.getByRole("button", { name: "Reserve" }).click();
  const dialog = page.getByRole("dialog", { name: "Demo payment" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  await page.screenshot({ path: `${out}/booking-390-payment.png` });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Reserve" })).toBeFocused();
});

test.beforeAll(async () => {
  await mkdir(out, { recursive: true });
});

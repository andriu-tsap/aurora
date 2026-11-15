import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("desktop globe, region dialog, keyboard and languages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause globe animation" }),
  ).toBeVisible();
  await page.waitForTimeout(2500);
  await mkdir("qa/screenshots", { recursive: true });
  await page.screenshot({ path: "qa/screenshots/hero-1440.png" });
  await page.getByRole("button", { name: "Pause globe animation" }).click();
  await expect(
    page.getByRole("button", { name: "Resume globe animation" }),
  ).toBeVisible();
  await page.locator(".regions button").nth(1).click();
  await expect(page.locator(".globe-label")).toContainText(
    "The Tatra Mountains",
  );
  await page.getByRole("button", { name: "Explore the region" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("The Tatra Mountains");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Language", { exact: true }).selectOption("uk");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.locator("h1")).toContainText("Знайди своє");
  await page.reload();
  await expect(page.locator("h1")).toContainText("Знайди своє");
  await page.getByLabel("Мова", { exact: true }).selectOption("pl");
  await expect(page.locator("h1")).toContainText("Znajdź swoje");
  await page.screenshot({ path: "qa/screenshots/hero-1440-pl.png" });
  expect(errors).toEqual([]);
});

test("mobile 390: static first, no 3D request before interaction, then opt in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1050 });
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("");
  await page.waitForTimeout(2000);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator(".globe-poster")).toBeVisible();
  const caption = await page.locator(".visual-caption").boundingBox();
  const activate = await page
    .getByRole("button", { name: "Explore in 3D" })
    .boundingBox();
  expect(
    caption && activate && caption.y + caption.height <= activate.y,
  ).toBeTruthy();
  await page.screenshot({ path: "qa/screenshots/hero-390.png" });
  const before = requests.length;
  await page.getByRole("button", { name: "Explore in 3D" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause globe animation" }),
  ).toBeVisible();
  expect(requests.length).toBeGreaterThan(before);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "qa/screenshots/hero-390-3d.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("360px all languages have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("");
  await page.screenshot({ path: "qa/screenshots/hero-360.png" });
  const field = await page.locator(".search label").boundingBox();
  const button = await page
    .getByRole("button", { name: "Explore the region" })
    .boundingBox();
  expect(field && button && button.y >= field.y + field.height).toBeTruthy();
  for (const language of ["en", "pl", "uk"]) {
    await page.locator(".language select").selectOption(language);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "qa/screenshots/hero-360-uk.png" });
});

test("reduced motion stays static and keyboard opens region", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("");
  await page.waitForTimeout(1800);
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Explore the region" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Explore the region" }),
  ).toBeFocused();
});

test("WebGL failure preserves geographic poster", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      ...args: Parameters<typeof getContext>
    ) {
      if (String(args[0]).includes("webgl")) return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto("");
  await expect(page.locator(".scene-error")).toBeVisible();
  await expect(page.locator(".globe-poster")).not.toHaveClass(/poster-hidden/);
});

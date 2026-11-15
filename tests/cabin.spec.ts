import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Software WebGL in CI is slow; a full post-processed frame can take ~30 s.
test.describe.configure({ timeout: 180_000 });

const out = "qa/screenshots/stage-2";

async function waitForCabin(page: Page) {
  await page.waitForFunction(
    () => (window as Window & { __auroraCabin?: unknown }).__auroraCabin,
    null,
    { timeout: 150_000 },
  );
  // Let damping, contact shadows and the environment settle.
  await page.waitForTimeout(2500);
  return page.evaluate(
    () =>
      (window as Window & { __auroraCabin?: { triangles: number } })
        .__auroraCabin!.triangles,
  );
}

async function capture(page: Page, name: string) {
  await mkdir(out, { recursive: true });
  // The orbit hint is a UI overlay, not part of the render.
  await page.locator(".cabin-hint").evaluate((el) => {
    (el as HTMLElement).style.visibility = "hidden";
  });
  await page
    .locator(".cabin-viewer")
    .screenshot({ path: `${out}/${name}.png` });
}

for (const time of ["day", "night"] as const) {
  test(`cabin ${time}: desktop 1440 render under triangle budget`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`cabin/?autoload=1&time=${time}`);
    const triangles = await waitForCabin(page);
    expect(triangles).toBeGreaterThan(10_000);
    expect(triangles).toBeLessThan(100_000);
    await expect(page.getByTestId("cabin-stats")).toContainText("triangles");
    await capture(page, `cabin-1440-${time}`);
    expect(errors).toEqual([]);
  });

  test(`cabin ${time}: phone 390 (DPR 3) render`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`cabin/?autoload=1&time=${time}`);
    await waitForCabin(page);
    await capture(page, `cabin-390-${time}`);
    await context.close();
  });
}

test("phone shows the still render first and loads 3D on request", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("cabin/");
  await page.waitForTimeout(1500);
  await expect(page.locator(".cabin-viewer canvas")).toHaveCount(0);
  await expect(page.locator(".cabin-poster")).toBeVisible();
  const poster = await page
    .locator(".cabin-poster")
    .evaluate((img) => (img as HTMLImageElement).naturalWidth);
  expect(poster).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Open the 3D model" }).click();
  await waitForCabin(page);
  await expect(page.locator(".cabin-viewer canvas")).toHaveCount(1);
});

test("finish, light and curtain controls update state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("cabin/?autoload=1");
  await waitForCabin(page);
  for (const name of ["Charred", "Bronze", "Night", "Closed"]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: /Reset view/ }).click();
  await page.getByLabel("Language", { exact: true }).selectOption("uk");
  await expect(page.locator("h1")).toContainText("AURORA A-frame");
  await expect(
    page.getByRole("button", { name: "Обпалене", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

import { expect, test } from "@playwright/test";

import { stubMapTiles } from "./support/map-stub";

const slug = "halny-ridge";
const other = "gorce-meadow";

test("favourites: add, see in account, survive reload, sync between tabs", async ({
  context,
  page,
}) => {
  await stubMapTiles(page);
  await page.goto("stays/");
  const heart = page.getByTestId(`fav-${slug}`);
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  // Stay page shows the same state.
  await page.goto(`stays/${slug}/`);
  await expect(page.getByTestId(`fav-${slug}`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Account lists it, and it is still there after a reload.
  await page.goto("account/");
  const list = page.getByTestId("favourites");
  await expect(list.getByRole("link", { name: /Halny Ridge/ })).toBeVisible();
  await page.reload();
  await expect(list.getByRole("link", { name: /Halny Ridge/ })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("aurora-favorites")),
  ).toBe(JSON.stringify([slug]));
  // Bookings keep their own key.
  expect(
    await page.evaluate(() => localStorage.getItem("aurora-bookings")),
  ).toBe(null);

  // A second tab adds another stay; the first tab updates without reload.
  const tab2 = await context.newPage();
  await stubMapTiles(tab2);
  await tab2.goto(`stays/${other}/`);
  await tab2.getByTestId(`fav-${other}`).click();
  await expect(list.getByRole("link")).toHaveCount(2);

  // Removing from the account list persists too.
  await page.getByTestId(`fav-${slug}`).click();
  await page.reload();
  await expect(list.getByRole("link")).toHaveCount(1);
});

test("favourites: blocked storage does not break the page", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const deny = () => {
      throw new DOMException("denied", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", { get: deny });
  });
  await page.goto(`stays/${slug}/`);
  const heart = page.getByTestId(`fav-${slug}`);
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("h1")).toBeVisible();
  expect(errors).toEqual([]);
});

test("favourites: no pop animation under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`stays/${slug}/`);
  const heart = page.getByTestId(`fav-${slug}`);
  await heart.click();
  const name = await heart
    .locator("svg")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe("none");
});

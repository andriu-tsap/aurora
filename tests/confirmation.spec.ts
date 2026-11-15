import { expect, test, type Page } from "@playwright/test";

import { stubMapTiles } from "./support/map-stub";

// Phone width: the stay page only loads the 3D cabin on click there. On wider
// screens the software-WebGL cabin starves the one-core CI/sandbox browser of
// animation frames, which stalls actionability checks and the confetti clock.
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await stubMapTiles(page);
});

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
    await page
      .getByRole("button", {
        name: /Next month|Następny miesiąc|Наступний місяць/,
      })
      .click();
  }
  throw new Error("no bookable range found");
}

/** Books a stay with the 4242 test card and returns the open dialog. */
async function book(page: Page) {
  await page.goto("stays/halny-ridge/");
  await expect(page.locator(".calendar-day").first()).toBeVisible();
  await pickDates(page);
  await page
    .getByRole("button", { name: /^(Reserve|Zarezerwuj|Забронювати)$/ })
    .click();
  const dialog = page.locator("dialog.checkout");
  await expect(dialog).toBeVisible();
  await dialog.locator('input[type="text"]').first().fill("Ola Nowak");
  await dialog
    .locator('input[inputmode="numeric"]')
    .fill("4242 4242 4242 4242");
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByTestId("booking-ref")).toBeVisible();
  return dialog;
}

test("confirmation: email preview with demo caption and a short confetti burst", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  const dialog = await book(page);
  await expect(page.getByTestId("email-preview")).toBeVisible();
  await expect(page.getByTestId("email-caption")).toHaveText(
    "demo: in production this email is sent to the guest",
  );
  await expect(dialog.getByTestId("email-preview")).toContainText("Ola Nowak");
  await expect(page.getByTestId("confetti")).toHaveCount(1);
  await expect(page.locator(".confetti-piece").first()).toBeVisible();
  // The burst cleans itself up.
  await expect(page.getByTestId("confetti")).toHaveCount(0, {
    timeout: 15_000,
  });
  // No third-party or network requests were made by the confetti.
  expect(requests.filter((u) => /confetti/i.test(u))).toEqual([]);
});

test("confirmation: no confetti under reduced motion, email still shown", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await book(page);
  await expect(page.getByTestId("email-preview")).toBeVisible();
  await expect(page.getByTestId("confetti")).toHaveCount(0);
  await expect(page.locator(".confetti-piece")).toHaveCount(0);
});

for (const [locale, caption] of [
  ["pl", "demo: w produkcji ten e-mail jest wysyłany do gościa"],
  ["uk", "demo: у продакшені цей лист надсилається гостю"],
] as const) {
  test(`confirmation: email caption in ${locale}`, async ({ page }) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem("aurora-locale", value);
    }, locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await book(page);
    await expect(page.getByTestId("email-caption")).toHaveText(caption);
  });
}

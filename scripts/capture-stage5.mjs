// Captures the stage-5 review screenshots of the owner panel from the static export served at
// http://127.0.0.1:4173/aurora/ (run `node scripts/serve-static.mjs` first).
// Existing files in the output folder are never deleted; same names are overwritten.
// One guest booking is injected into localStorage so the occupancy calendar shows that state;
// the README next to the images says so.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = "http://127.0.0.1:4173/aurora/admin/";
const out = "docs/visual-reviews/stage-5";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});

const guestBooking = {
  reference: "AUR-SHOT01",
  slug: "halny-ridge",
  stayName: "Halny Ridge",
  guestName: "Screenshot Guest",
  checkIn: "2026-11-10",
  checkOut: "2026-11-14",
  guests: 2,
  nights: 4,
  totalCents: 60000,
  status: "confirmed",
  createdAt: "2026-11-01T10:00:00.000Z",
};

const sizes = [
  { width: 1440, height: 1000, scale: 1 },
  { width: 390, height: 844, scale: 2 },
];

for (const locale of ["en", "uk"]) {
  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.scale,
    });
    await context.addInitScript(
      ([lang, booking]) => {
        localStorage.setItem("aurora-locale", lang);
        localStorage.setItem("aurora-bookings", JSON.stringify([booking]));
      },
      [locale, guestBooking],
    );
    const page = await context.newPage();
    // Only Date is frozen, so the calendar opens on November 2026 in every run.
    await page.clock.setFixedTime(new Date("2026-11-16T12:00:00Z"));
    const shot = (name, fullPage = false) =>
      page.screenshot({
        path: `${out}/${name}-${size.width}-${locale}.png`,
        fullPage,
      });

    await page.goto(base);
    await page.getByTestId("demo-login").waitFor();
    await page.waitForTimeout(500);
    await shot("login");

    await page.getByTestId("demo-login").click();
    await page.getByTestId("property-list").waitFor();
    await page.locator(".thumb").first().waitFor();
    await page.waitForTimeout(800);
    await shot("list", size.width < 800);

    await page.goto(`${base}#/properties/new`);
    await page.getByTestId("stay-form").waitFor();
    await page.waitForTimeout(400);
    await shot("form", size.width < 800);

    await page.goto(`${base}#/occupancy`);
    await page.getByTestId("revenue-table").waitFor();
    await page.getByTestId("cal-property").selectOption("halny-ridge");
    await page.waitForTimeout(600);
    await shot("occupancy", true);

    await context.close();
  }
}

await browser.close();
console.log("done");

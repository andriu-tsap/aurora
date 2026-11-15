// Renders the code-built cabin once and saves the still fallback shown to
// phones, data-saver visitors and devices without WebGL.
// Usage (static build served at :4173/aurora/):
//   node scripts/capture-cabin-poster.mjs
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const webRequire = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = createRequire(webRequire.resolve("next"))("sharp");

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});
await page.goto("http://127.0.0.1:4173/aurora/cabin/?autoload=1&time=day");
await page.waitForFunction(() => globalThis.__auroraCabin, null, {
  timeout: 180000,
});
await page.waitForTimeout(3000);
await page
  .locator(".cabin-hint")
  .evaluate((el) => (el.style.visibility = "hidden"));
const png = await page.locator(".cabin-viewer").screenshot();
await browser.close();

const dir = "apps/web/public/cabin";
await mkdir(dir, { recursive: true });
for (const width of [800, 1600]) {
  const image = sharp(png).resize(width, Math.round(width / 1.6), {
    fit: "cover",
  });
  await image
    .clone()
    .avif({ quality: 55, effort: 7 })
    .toFile(`${dir}/cabin-poster-${width}.avif`);
  await image
    .clone()
    .webp({ quality: 80 })
    .toFile(`${dir}/cabin-poster-${width}.webp`);
}
console.log("Saved cabin posters to", dir);

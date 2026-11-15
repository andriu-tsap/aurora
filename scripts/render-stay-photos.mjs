// Renders gallery photos for every wood/metal look used in the demo
// catalogue, from the code-built cabin (no stock photography).
// Requires the static build served at :4173/aurora/.
//   node scripts/render-stay-photos.mjs
import { chromium } from "@playwright/test";
import { mkdir, readFile, access } from "node:fs/promises";
import { createRequire } from "node:module";

const webRequire = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = createRequire(webRequire.resolve("next"))("sharp");

const source = await readFile("packages/demo-data/src/index.ts", "utf8");
const looks = [
  ...new Set(
    [...source.matchAll(/look: \{ wood: "(\w+)", metal: "(\w+)" \}/g)].map(
      (m) => `${m[1]}-${m[2]}`,
    ),
  ),
];
const shots = [
  ["hero", "day"],
  ["side", "day"],
  ["aerial", "day"],
  ["hero", "night"],
  ["front", "day"],
  ["front", "night"],
];
const dir = "apps/web/public/stays/renders";
await mkdir(dir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
for (const look of looks) {
  const [wood, metal] = look.split("-");
  for (const [view, time] of shots) {
    const name = `${look}-${view}-${time}`;
    try {
      await access(`${dir}/${name}-1200.webp`);
      continue; // already rendered
    } catch {
      /* render it */
    }
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1.35,
    });
    await page.goto(
      `http://127.0.0.1:${process.env.RENDER_PORT || 4173}/aurora/cabin/?autoload=1&wood=${wood}&metal=${metal}&time=${time}&view=${view}`,
    );
    await page.waitForFunction(() => globalThis.__auroraCabin, null, {
      timeout: 240000,
    });
    await page.waitForTimeout(2500);
    await page
      .locator(".cabin-hint")
      .evaluate((el) => (el.style.visibility = "hidden"));
    // Software WebGL needs minutes per frame (about 170 s even at low quality
    // on one CPU core), so use a long timeout and clip by bounding box.
    const box = await page.locator(".cabin-viewer").boundingBox();
    const png = await page.screenshot({
      clip: box,
      fullPage: true,
      timeout: 240000,
    });
    await page.close();
    for (const width of [600, 1200]) {
      const image = sharp(png).resize(width, Math.round(width / 1.6), {
        fit: "cover",
      });
      await image
        .clone()
        .avif({ quality: 52, effort: 6 })
        .toFile(`${dir}/${name}-${width}.avif`);
      await image
        .clone()
        .webp({ quality: 78 })
        .toFile(`${dir}/${name}-${width}.webp`);
    }
    console.log("rendered", name);
  }
}
await browser.close();
console.log("looks:", looks.join(", "));

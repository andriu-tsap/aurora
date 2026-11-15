// Rasterizes the geographic SVG poster into responsive AVIF/WebP variants.
import { createRequire } from "node:module";
const webRequire = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const nextRequire = createRequire(webRequire.resolve("next"));
const sharp = nextRequire("sharp");
const source = "apps/web/public/globe-poster.svg";
for (const width of [480, 720, 960]) {
  const image = sharp(source, { density: 220 }).resize(width, width);
  await image
    .clone()
    .avif({ quality: 50, effort: 7 })
    .toFile(`apps/web/public/globe-poster-${width}.avif`);
  await image
    .clone()
    .webp({ quality: 78, alphaQuality: 90 })
    .toFile(`apps/web/public/globe-poster-${width}.webp`);
}
// Kept for social previews and older links.
await sharp(source, { density: 220 })
  .resize(960, 960)
  .webp({ quality: 82, alphaQuality: 95 })
  .toFile("apps/web/public/globe-poster.webp");

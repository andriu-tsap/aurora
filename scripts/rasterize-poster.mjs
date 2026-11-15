import { createRequire } from "node:module";
const webRequire = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const nextRequire = createRequire(webRequire.resolve("next"));
const sharp = nextRequire("sharp");
await sharp("apps/web/public/globe-poster.svg")
  .resize(960, 960)
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile("apps/web/public/globe-poster.webp");

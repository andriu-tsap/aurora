import lighthouse from "lighthouse";
import { createRequire } from "node:module";
const require = createRequire(import.meta.resolve("lighthouse"));
const chromeLauncher = await import(require.resolve("chrome-launcher"));
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("qa/lighthouse", { recursive: true });
const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless", "--no-sandbox"],
});
try {
  const result = await lighthouse("http://127.0.0.1:4173/aurora/", {
    port: chrome.port,
    output: ["html", "json"],
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  });
  await writeFile("qa/lighthouse/mobile.html", result.report[0]);
  await writeFile("qa/lighthouse/mobile.json", result.report[1]);
  const scores = Object.fromEntries(
    Object.entries(result.lhr.categories).map(([key, value]) => [
      key,
      Math.round(value.score * 100),
    ]),
  );
  await writeFile("qa/lighthouse/scores.json", JSON.stringify(scores, null, 2));
  console.log(scores);
  // Report-only scores for the secondary pages, including the owner panel
  // (admin/, demo login screen, hash routes); never a deploy gate.
  const pages = {};
  for (const path of ["stays/", "stays/halny-ridge/", "account/", "cabin/", "admin/"]) {
    const page = await lighthouse(`http://127.0.0.1:4173/aurora/${path}`, {
      port: chrome.port,
      output: "json",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    pages[path] = Object.fromEntries(
      Object.entries(page.lhr.categories).map(([key, value]) => [
        key,
        Math.round(value.score * 100),
      ]),
    );
  }
  await writeFile("qa/lighthouse/pages.json", JSON.stringify(pages, null, 2));
  console.log(pages);
  for (const [id, audit] of Object.entries(result.lhr.audits)) {
    if (audit.score !== null && audit.score < 0.9)
      console.log(
        id,
        audit.score,
        audit.displayValue || "",
        audit.description?.slice(0, 100),
      );
  }
} finally {
  await chrome.kill();
}

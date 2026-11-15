// Copies the Angular build into the Next static export so one Pages artifact serves both.
import { cp, rm, stat } from "node:fs/promises";
import path from "node:path";

const from = path.resolve("dist/admin/browser");
const to = path.resolve("../web/out/admin");
try {
  await stat(path.resolve("../web/out/index.html"));
} catch {
  console.error("apps/web/out is missing: build @aurora/web first.");
  process.exit(1);
}
await rm(to, { recursive: true, force: true });
await cp(from, to, { recursive: true });
console.log(`admin copied to ${to}`);

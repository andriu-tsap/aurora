import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "qa/playwright" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173/aurora/",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-webgl"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve-static.mjs",
    url: "http://127.0.0.1:4173/aurora/",
    reuseExistingServer: true,
  },
});

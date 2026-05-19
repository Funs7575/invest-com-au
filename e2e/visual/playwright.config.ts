import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated Playwright config for the visual screenshot pipeline.
 *
 * Run: `npm run screenshots` (or `npm run screenshots:seed -- <state>` for auth seeding).
 *
 * Why a separate config:
 *   - The screenshot run takes minutes-to-hours (671 routes × N states × 3 viewports)
 *     and should NOT run as part of `npm run e2e` or per-PR CI.
 *   - The dev server is started here in `webServer` (reused if already running locally).
 */
export default defineConfig({
  testDir: ".",
  timeout: 0,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: {
    command: "npm run dev",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
  projects: [
    {
      name: "screenshots",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

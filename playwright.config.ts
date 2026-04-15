import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for invest-com-au end-to-end tests.
 *
 * Target: the Next.js dev server on localhost:3000. CI is
 * responsible for `npm run dev &` before `npx playwright test`.
 * Locally you can run them the same way, or use `npm run e2e`
 * which chains both.
 *
 * Retries:
 *   - 2 on CI (flakiness survival)
 *   - 0 locally (faster feedback on failing tests)
 *
 * Reporter:
 *   - GitHub Actions reporter on CI (annotated PR checks)
 *   - HTML locally so failures open a browser with traces/videos
 *
 * Projects: one Chromium project by default. Add Firefox + WebKit
 * to the projects array if you want cross-browser coverage.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : [["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  expect: {
    timeout: 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});

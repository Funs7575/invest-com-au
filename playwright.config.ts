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
    // Vercel protection-bypass header. When set, Vercel skips the
    // preview-deployment auth wall and returns the app directly.
    // Generated via: Vercel dashboard → Project → Settings →
    // Deployment Protection → "Protection Bypass for Automation".
    // Pair with the workflow-level secret VERCEL_AUTOMATION_BYPASS_SECRET.
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          "x-vercel-set-bypass-cookie": "samesitenone",
        }
      : undefined,
  },
  expect: {
    timeout: 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // WebKit catches Safari-specific issues — different layout engine
    // than Chromium/Blink. iOS Safari and macOS Safari ship the same
    // engine, so this covers both. Mobile Safari viewport tested
    // separately below.
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile viewport — catches responsive layout regressions and
    // touch-specific event bugs that desktop projects miss.
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  // Skip the local webServer when E2E_BASE_URL points at an
  // external target (e.g. a Vercel preview deploy). The
  // e2e-preview.yml workflow sets E2E_SKIP_WEBSERVER=1 so
  // Playwright doesn't try to `npm run start` against a preview
  // URL that's already live.
  webServer:
    process.env.E2E_SKIP_WEBSERVER === "1"
      ? undefined
      : process.env.CI
        ? {
            command: "npm run start",
            url: "http://localhost:3000",
            reuseExistingServer: false,
            timeout: 120_000,
          }
        : undefined,
});

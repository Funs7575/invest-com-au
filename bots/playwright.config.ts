import { defineConfig, devices } from "@playwright/test";
import { loadConfig, assertTargetAllowed } from "./config";

/**
 * Dedicated Playwright config for the bot fleet.
 *
 * Run: `npm run bots` (drives whatever BOTS_BASE_URL points at; defaults to a
 * local dev server). Kept separate from the main e2e config so the fleet —
 * which is long-running and AI-driven in later phases — never runs in per-PR
 * CI by accident.
 */

const config = loadConfig();
// Last line of defence: refuse a prod target unless explicitly overridden.
assertTargetAllowed(config);

// Pin one run id/dir + start time so the parallel workers and the
// separate-process globalTeardown all share a single run directory.
process.env.BOTS_RUN_ID = config.runId;
process.env.BOTS_RUN_DIR = config.runDir;
process.env.BOTS_BASE_URL = config.baseUrl;
process.env.BOTS_STARTED_AT = process.env.BOTS_STARTED_AT ?? new Date().toISOString();

const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(config.host);

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  // Keep Playwright artifacts inside the (gitignored) run dir so bot runs never
  // dirty the tracked tree.
  outputDir: `${config.runDir}/artifacts`,
  // Sessions visit several routes and run axe + link checks; give them room.
  timeout: 180_000,
  fullyParallel: true,
  retries: 0,
  workers: config.concurrency,
  reporter: [["list"]],
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: config.baseUrl,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "bots", use: { ...devices["Desktop Chrome"] } }],
  // Only boot a dev server for a local target. A remote preview/staging URL is
  // assumed to be already live.
  webServer:
    process.env.BOTS_SKIP_WEBSERVER === "1" || !isLocal
      ? undefined
      : {
          // Defaults to the dev server; override with BOTS_WEBSERVER_CMD (e.g.
          // "npm run start" to drive the production build instead).
          command: process.env.BOTS_WEBSERVER_CMD ?? "npm run dev",
          url: config.baseUrl,
          reuseExistingServer: true,
          timeout: 600_000,
          stdout: "pipe",
          stderr: "pipe",
        },
});

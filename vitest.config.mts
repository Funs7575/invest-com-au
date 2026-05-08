import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // Prevent Vitest from treating setInterval rate-limiter cleanup as a leak
    teardownTimeout: 1000,
    pool: "forks",
    // Use jsdom for component tests via in-file config
    environmentMatchGlobs: [
      ["__tests__/components/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: ["lib/**/*.ts", "lib/**/*.tsx", "app/api/**/*.ts"],
      exclude: [
        "lib/database.types.ts",
        "lib/types.ts",
        "**/*.d.ts",
      ],
      // Floors, not aspirations. Set just below current numbers so
      // CI catches coverage regressions without blocking ships that
      // add new (legitimately untested) code. Ratchet these up as
      // test suites grow; do not lower them.
      // 2026-04-23: fifth ratchet — overnight continuous-improvement
      // pass. ~640 new tests across 65+ new files.
      // Measured: lines/stmt 42.65%, branches 72.66%, functions 63.07%.
      //
      // 2026-04-27: sixth ratchet — D-01..D-09 integration tests for
      // 9 API routes (submit-lead, quiz-lead, advisor-lead,
      // advisor-apply, stripe/refund-subscription,
      // stripe/cancel-subscription, stripe/create-portal,
      // stripe/create-contract, auth/signout).
      // Measured: lines/stmt 44.45%, branches 73.02%, functions 63.74%.
      // API-route floor (D-10): scoped run with app/api/**/*.ts only:
      // lines/stmt 13.82%, branches 58.35%, functions 30.18%.
      //
      // 2026-05-07: seventh ratchet — D-11 (100+ route batches) + R-stream
      // lib tests + KK/W/J/C/E stream additions. R-COVERAGE-RATCHET M1.
      // Measured 2026-05-02: lines/stmt 70.94%, branches 79.61%, fns 79.04%.
      // Floors set ~5-6pp below measurements (wider buffer than 1pp because
      // in-flight PRs add new code before tests; prevents false CI failures).
      // API-route floor raised proportionally from D-11 batch coverage.
      thresholds: {
        lines: 65,
        functions: 74,
        branches: 74,
        statements: 65,
        // API-route floor. Raised from 13/58/30 (D-10, Apr 2026) after
        // D-11 added tests for virtually all existing routes (batches 1-23+,
        // ~110 route files covered). Conservative 5pp buffer applied.
        "app/api/**/*.ts": {
          lines: 40,
          branches: 62,
          functions: 40,
          statements: 40,
        },
      },
    },
  },
});

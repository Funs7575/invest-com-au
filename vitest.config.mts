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
      // Floors set 1pp below measurements per ratchet policy.
      thresholds: {
        lines: 44,
        functions: 63,
        branches: 73,
        statements: 44,
        // API-route floor (D-10). Measured 2026-04-27 post D-01..D-09:
        // 13.82% lines, 58.35% branches, 30.18% fns.
        // 228 untested routes remain (D-11); this floor catches
        // regressions in the 9 covered routes without penalising them.
        "app/api/**/*.ts": {
          lines: 13,
          branches: 58,
          functions: 30,
          statements: 13,
        },
      },
    },
  },
});

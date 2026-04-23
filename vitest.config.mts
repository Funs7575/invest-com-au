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
      // pass. New suites: marketplace/packages + wallet + frequency-
      // cap, server/course-access + get-subscription, web-vitals
      // capture/rollup, admin/automation-metrics + classifier-config,
      // api-auth, job-queue, admin-mfa, advisor-billing, advisor-
      // emails/kyc/verification/specialties/guides/booking, advisor-
      // application-resolver lookups, verify-abn/afsl, invest-
      // categories, listing-verticals, ticker-sectors, glossary,
      // firb-data, foreign-investment-data, scenario-content,
      // compliance-config, versus-content, request-cache, resend,
      // form-persistence, form-tracking, quiz-history, course, env,
      // best-broker-categories, topic-clusters, property-images,
      // investment-listings-query, cached-advisor-guides, fi-data-
      // server pure helpers, hooks/{useUser, useCourseAccess,
      // useSubscription}, account/{bookmarks, delete, accept-terms},
      // cron/{referral-payouts, data-integrity-audit}, track-event
      // error paths, BrokerLogo + BackToTop + ArticleSearchInput +
      // CollapsibleSection components, top-level error boundary.
      // ~640 new tests across 65+ new files.
      // Measured at end of session: lines/stmt 42.65, branches 72.66,
      // functions 63.07.
      thresholds: {
        lines: 42,
        functions: 63,
        branches: 72,
        statements: 42,
      },
    },
  },
});

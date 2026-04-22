// @ts-check
/**
 * Stryker mutation testing config.
 *
 * STATUS: skeleton — Stryker is NOT in package.json devDependencies
 * yet because adding deps is out of scope for this session. See
 * the enable-me block at the bottom for the one-command install +
 * the npm script + CI workflow entry needed to flip this on.
 *
 * WHY MUTATION TESTING:
 *   Coverage % tells you which lines the test suite executed. It
 *   does NOT tell you whether the assertions actually verify
 *   behaviour. A test that calls a function and throws away the
 *   return value passes but asserts nothing. Mutation testing
 *   deliberately breaks your code (flips conditionals, drops
 *   return values, etc.) and reports which mutations your tests
 *   failed to catch. High mutation score = your tests actually
 *   work.
 *
 * TARGETED FILES (not the whole codebase):
 *   Stryker is slow — a full run on 60k LOC takes ~30 minutes. We
 *   only run it on security-critical and financial-critical code
 *   where a silently-passing test is expensive:
 *
 *     - lib/cron-auth.ts         — cron auth gate
 *     - lib/require-admin.ts     — admin route guard
 *     - lib/admin.ts             — admin email resolvers
 *     - lib/financial-audit.ts   — AFSL s912D audit trail
 *     - lib/article-preview-tokens.ts — draft preview tokens
 *     - lib/ab-winner.ts         — auto-promoter stats math
 *
 *   This list is conservative. Add files only when they're both
 *   (a) security/financial/compliance critical AND (b) have
 *   existing unit tests with ≥80% line coverage (Stryker needs
 *   coverage to have something to mutate).
 */

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: "npm",
  reporters: ["html", "progress", "clear-text"],
  testRunner: "vitest",

  // Paths we mutate. Everything else is imported-but-not-mutated.
  mutate: [
    "lib/cron-auth.ts",
    "lib/require-admin.ts",
    "lib/admin.ts",
    "lib/financial-audit.ts",
    "lib/article-preview-tokens.ts",
    "lib/ab-winner.ts",
  ],

  // How strict — fail CI if the mutation score drops below this.
  // Start permissive (60) because some mutations are inherently
  // hard to kill (e.g. log-message string mutations that don't
  // affect behaviour). Ratchet up once a baseline is established.
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },

  // Time budget per mutation. Higher numbers catch flaky tests but
  // slow the overall run. Tune based on observed run time; default
  // Stryker value is 5000ms.
  timeoutMS: 10000,

  // Skip mutations Stryker's default config flags as "too noisy":
  //   StringLiteral — every log message mutation survives; no signal
  //   BlockStatement — drops whole try/catch blocks; most tests catch it anyway
  mutator: {
    excludedMutations: ["StringLiteral"],
  },

  vitest: {
    // Point at the existing vitest config so TS paths resolve
    configFile: "./vitest.config.mts",
  },
};

/*
──────────────────────────────────────────────────────────────────
ENABLE ME (~15 min once you're ready):

1. Install Stryker + the vitest runner:

   npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner

2. Add an npm script to package.json:

   "mutation": "stryker run"

3. Run locally to generate the first baseline:

   npm run mutation

4. Review the HTML report at reports/mutation/mutation.html.
   Expect 60-80% killed on the listed files if the tests are
   meaningful. A score under 50 means the tests pass but aren't
   actually verifying much — fix the tests before merging.

5. Optional CI gate — only make this blocking after the initial
   baseline is stable:

   .github/workflows/mutation.yml:

     name: Mutation testing (weekly)
     on:
       schedule:
         - cron: "0 2 * * 1"   # Monday 02:00 UTC
       workflow_dispatch:
     jobs:
       stryker:
         runs-on: ubuntu-latest
         timeout-minutes: 30
         steps:
           - uses: actions/checkout@v6
           - uses: actions/setup-node@v6
             with:
               node-version: "20"
               cache: "npm"
           - run: npm ci
           - run: npm run mutation

   Run weekly, not on every PR — 30 min is too slow for the PR
   critical path. The scheduled run reports the mutation score
   in the GitHub Actions summary; dashboard via Stryker's
   dashboard.stryker-mutator.io if you want a trend line.
──────────────────────────────────────────────────────────────────
*/

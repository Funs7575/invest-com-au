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
      thresholds: {
        lines: 20,
        functions: 45,
        branches: 50,
        statements: 20,
      },
    },
  },
});

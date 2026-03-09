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
  },
});

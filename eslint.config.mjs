import nextConfig from "eslint-config-next/core-web-vitals";
import tsConfig from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextConfig,
  ...tsConfig,
  {
    rules: {
      // ── Downgrade noisy pre-existing violations to warnings ──────────────
      // Apostrophes / unescaped entities in JSX copy — style, not a bug
      "react/no-unescaped-entities": "warn",
      // <a> vs <Link> — warn for now; fix incrementally
      "@next/next/no-html-link-for-pages": "warn",
      // <img> vs <Image> — warn for now; fix incrementally
      "@next/next/no-img-element": "warn",
      // react-hooks v5 new strict rules — existing code predates these
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",

      // ── TypeScript ────────────────────────────────────────────────────────
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Allow explicit any (warn only)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow Function type (warn only)
      "@typescript-eslint/no-unsafe-function-type": "warn",
      // Wave 12 — promote a few safety rules to errors. These are
      // cheap to satisfy in new code and keep the codebase from
      // regressing on obvious footguns. The rules we DON'T promote
      // (no-unused-vars, no-explicit-any) still fire as warnings
      // until the backlog gets tidied up incrementally.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: false },
      ],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "smart"],
    },
  },
];

export default eslintConfig;

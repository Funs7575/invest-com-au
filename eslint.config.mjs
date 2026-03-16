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
    },
  },
];

export default eslintConfig;

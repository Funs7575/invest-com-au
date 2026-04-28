import nextConfig from "eslint-config-next/core-web-vitals";
import tsConfig from "eslint-config-next/typescript";

// ── Custom rule: no-unsafe-inner-html ────────────────────────────────────────
// Flags dangerouslySetInnerHTML whose __html value is not one of the three
// safe patterns:  JSON.stringify(...)  |  sanitizeHtml(...)  |  renderMarkdown(...)
// String literals and zero-expression template literals are also allowed
// (they carry no dynamic content). Any other expression — an identifier, a
// member-expression, or a template literal with ${...} substitutions —
// must be explicitly suppressed with an eslint-disable-next-line comment
// that explains WHY the value is safe.
function isSafeHtml(node) {
  if (!node) return false;
  // Plain string literal — no dynamic content possible.
  if (node.type === "Literal" && typeof node.value === "string") return true;
  // Template literal with zero expressions — equivalent to a string literal.
  if (node.type === "TemplateLiteral" && node.expressions.length === 0)
    return true;
  if (node.type === "CallExpression") {
    const { callee } = node;
    // JSON.stringify(...)
    if (
      callee.type === "MemberExpression" &&
      callee.object.type === "Identifier" &&
      callee.object.name === "JSON" &&
      callee.property.type === "Identifier" &&
      callee.property.name === "stringify"
    )
      return true;
    // sanitizeHtml(...) or renderMarkdown(...)
    if (
      callee.type === "Identifier" &&
      (callee.name === "sanitizeHtml" || callee.name === "renderMarkdown")
    )
      return true;
  }
  return false;
}

const investPlugin = {
  rules: {
    "no-unsafe-inner-html": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Require dangerouslySetInnerHTML __html to use JSON.stringify, sanitizeHtml, or renderMarkdown",
        },
        messages: {
          unsafeHtml:
            "dangerouslySetInnerHTML __html must use JSON.stringify(...), sanitizeHtml(...), renderMarkdown(...), or a string/zero-expression-template literal. Add eslint-disable-next-line with a safety comment if this value is intentionally trusted.",
        },
        schema: [],
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name.name !== "dangerouslySetInnerHTML") return;
            const valueNode = node.value;
            if (!valueNode || valueNode.type !== "JSXExpressionContainer")
              return;
            const expr = valueNode.expression;
            if (!expr || expr.type !== "ObjectExpression") return;
            for (const prop of expr.properties) {
              if (prop.type !== "Property") continue;
              const keyName =
                prop.key.type === "Identifier"
                  ? prop.key.name
                  : prop.key.value;
              if (keyName !== "__html") continue;
              if (!isSafeHtml(prop.value)) {
                context.report({ node: prop.value, messageId: "unsafeHtml" });
              }
            }
          },
        };
      },
    },
  },
};

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextConfig,
  ...tsConfig,
  {
    plugins: { invest: investPlugin },
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
      //
      // Wave 18 follow-up: @typescript-eslint/no-misused-promises
      // was originally in this list but it's a *typed* lint rule
      // that needs parserOptions.project wired up to a tsconfig.
      // The newer typescript-eslint shipped by eslint-config-next
      // 16.2.3 errors hard on typed rules without that config. We
      // could enable typed linting globally but it's a meaningful
      // perf hit and a separate refactor. Dropping the rule for
      // now; everything else here is lexical (no type info needed).
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "smart"],

      // ── Security ─────────────────────────────────────────────────────────
      // K-13: ban dangerouslySetInnerHTML outside safe sanitization contexts.
      // Allowed: JSON.stringify(...) | sanitizeHtml(...) | renderMarkdown(...)
      //          | string literal | zero-expression template literal.
      // All other forms require an eslint-disable-next-line comment explaining
      // why the value is safe (e.g. server-only env var, hardcoded constant).
      "invest/no-unsafe-inner-html": "error",
    },
  },
  {
    // Service-role Supabase client must not appear in public RSC routes —
    // it bypasses RLS. Use createClient from @/lib/supabase/server (anon
    // with cookies) for any data a logged-out visitor should see. Admin /
    // API / account routes are exempt because they legitimately need
    // elevated access.
    //
    // Set as "warn" because there is a backlog of ~17 public pages still
    // importing the admin client (best-for, invest/funds, research,
    // how-to/transfer-from, advisors/search, etc). Ratchet to "error"
    // once the backlog is cleared.
    files: ["app/**/page.tsx", "app/**/layout.tsx"],
    ignores: ["app/admin/**", "app/api/**", "app/account/**"],
    rules: {
      "no-restricted-imports": ["warn", {
        paths: [{
          name: "@/lib/supabase/admin",
          message: "createAdminClient bypasses RLS and must not be used in public RSC pages. Use createClient from @/lib/supabase/server instead.",
        }],
      }],
    },
  },
  {
    // .github/workflows/scripts/** runs in Node CommonJS via github-script's
    // require() pattern. ESM is not compatible with how the workflow YAML
    // invokes these helpers. Allow require() here only.
    files: [".github/workflows/scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];

export default eslintConfig;

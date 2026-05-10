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

// ── Custom rule: no-unvalidated-req-json ─────────────────────────────────────
// Stream E (Zod validation rollout). Flags `req.json()` / `request.json()`
// whose result is not consumed by Zod (`.parse(...)` / `.safeParse(...)`)
// or by the `withValidatedBody` helper inside the same enclosing function
// scope.
//
// Severity is `warn` — the rule is a *forward* guardrail, not a retroactive
// migration tool. The 200+ legacy routes that pre-date Stream E continue to
// emit warnings until E-02 migrates them; lint-staged's `--max-warnings 0`
// catches NEW drift on staged files, while `npm run lint` doesn't break.
//
// Allowed shapes:
//   const Schema = z.object({ ... });
//   const body = Schema.parse(await req.json());
//   const body = Schema.safeParse(await req.json());
//   const body = await req.json().then(d => Schema.parse(d));
//   export const POST = withValidatedBody(Schema, async (req, body) => {...});
//
// Test files (`__tests__/**`, `*.test.ts(x)`) are exempt — mocks legitimately
// call `.json()` without Zod. The rule is also disabled for the helper itself
// (`lib/validation/**`) because it's the wrapper that does the validating.
//
// Inline opt-out for a legitimate exception:
//   // eslint-disable-next-line invest/no-unvalidated-req-json -- <reason>
//   const raw = await req.json();
//
// Author the comment with a `--` prefix and a short reason so the disable is
// reviewable.
function callExprIsParseOrSafeParse(node) {
  if (!node || node.type !== "CallExpression") return false;
  const callee = node.callee;
  if (!callee || callee.type !== "MemberExpression") return false;
  if (callee.property.type !== "Identifier") return false;
  const name = callee.property.name;
  return name === "parse" || name === "safeParse";
}

function functionScopeContainsZod(fnNode) {
  // Walk the function body and return true if any descendant is either:
  //   - a `.parse(...)` / `.safeParse(...)` call expression, or
  //   - a `withValidatedBody(...)` call expression.
  // We DO descend into nested arrow/function expressions because the
  // common ergonomic patterns hand off the body via a callback:
  //   await req.json().then(d => Schema.parse(d))
  //   withValidatedBody(Schema, async (req, body) => { ... })
  // Treating those callbacks as out-of-scope would create noisy false
  // positives. The trade-off is a small false-negative rate where two
  // unrelated nested handlers in the same module reuse one `parse` call —
  // acceptable for a warn-level forward guardrail, and lint-staged still
  // catches NEW drift on staged files.
  if (!fnNode) return false;
  let found = false;
  const visit = (node) => {
    if (!node || typeof node !== "object" || found) return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (typeof node.type !== "string") return;
    if (node.type === "CallExpression") {
      if (callExprIsParseOrSafeParse(node)) {
        found = true;
        return;
      }
      if (
        node.callee &&
        node.callee.type === "Identifier" &&
        node.callee.name === "withValidatedBody"
      ) {
        found = true;
        return;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "parent" || key === "loc" || key === "range") continue;
      visit(node[key]);
    }
  };
  visit(fnNode);
  return found;
}

function findEnclosingFunction(node) {
  let cur = node.parent;
  while (cur) {
    if (
      cur.type === "FunctionDeclaration" ||
      cur.type === "FunctionExpression" ||
      cur.type === "ArrowFunctionExpression"
    ) {
      return cur;
    }
    cur = cur.parent;
  }
  return null;
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
    "no-unvalidated-req-json": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Require req.json() / request.json() to be consumed by Zod (.parse / .safeParse) or by withValidatedBody",
        },
        messages: {
          unvalidated:
            "`{{ident}}.json()` must be consumed by a Zod schema (Schema.parse / Schema.safeParse) or wrapped in withValidatedBody. See lib/validation/withValidatedBody.ts. Suppress with `// eslint-disable-next-line invest/no-unvalidated-req-json -- <reason>` if the body is intentionally untyped.",
        },
        schema: [],
      },
      create(context) {
        return {
          // Visit the `req.json()` / `request.json()` CallExpression
          // directly (rather than the enclosing AwaitExpression) so that
          // chained shapes like `await req.json().catch(() => ({}))`,
          // `await req.json().then(d => Schema.parse(d))`, and bare
          // `req.json().then(...)` are all caught by the same selector.
          CallExpression(node) {
            const callee = node.callee;
            if (!callee || callee.type !== "MemberExpression") return;
            if (callee.computed) return;
            if (callee.property.type !== "Identifier") return;
            if (callee.property.name !== "json") return;
            if (callee.object.type !== "Identifier") return;
            const ident = callee.object.name;
            // Match req / request — the conventional names in Next.js route
            // handlers. Other names (e.g. `someStream.json()` on a fetch
            // Response) are out of scope; this rule is targeted at the
            // request body, not arbitrary Response.json() reads.
            if (ident !== "req" && ident !== "request") return;

            // Allowed shape: parent is a `.parse(...)` / `.safeParse(...)`
            // call — `Schema.parse(req.json())` (rare; the awaited form is
            // handled by the scope sweep below).
            if (callExprIsParseOrSafeParse(node.parent)) return;

            // Allowed shape: anywhere in the enclosing function scope, the
            // result is consumed by `.parse(...)`, `.safeParse(...)`, or
            // wrapped in `withValidatedBody(...)`.
            const fn = findEnclosingFunction(node);
            if (functionScopeContainsZod(fn)) return;

            context.report({
              node,
              messageId: "unvalidated",
              data: { ident },
            });
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

      // ── Validation (Stream E) ────────────────────────────────────────────
      // E-03: forward guardrail — new `await req.json()` / `await
      // request.json()` must be consumed by a Zod schema or wrapped in
      // withValidatedBody. Severity is `warn` because ~200 legacy routes
      // pre-date Stream E; `npm run lint` should still pass while E-02
      // migrates them. The husky/lint-staged hook runs `eslint --fix
      // --max-warnings 0` on staged files, so NEW drift on staged routes
      // is caught at commit time — only previously-touched legacy files
      // get a free pass.
      "invest/no-unvalidated-req-json": "warn",
    },
  },
  {
    // The withValidatedBody helper itself calls `await req.json()` — that
    // *is* the validation entry point. Linting the helper would create a
    // circular complaint, so disable the rule for the validation module.
    files: ["lib/validation/**/*.{ts,tsx}"],
    rules: {
      "invest/no-unvalidated-req-json": "off",
    },
  },
  {
    // Test files legitimately call `.json()` on mocked requests/responses
    // and on assertion targets — there's no body-validation contract to
    // uphold. Disable the rule across all test surfaces.
    files: [
      "__tests__/**/*.{ts,tsx,js,mjs}",
      "**/*.test.{ts,tsx,js,mjs}",
      "**/*.spec.{ts,tsx,js,mjs}",
      "e2e/**/*.{ts,tsx}",
    ],
    rules: {
      "invest/no-unvalidated-req-json": "off",
    },
  },
  {
    // The E-03 lint fixture deliberately includes an
    // `// eslint-disable-next-line invest/no-unvalidated-req-json` comment
    // to exercise the inline-opt-out machinery. Because the rule is OFF
    // across `__tests__/**`, the project lint then flags that disable as
    // "unused". Suppress that meta-warning on the fixture only — the
    // companion test runs the rule with its own ESLint instance, where the
    // directive is meaningful.
    files: ["__tests__/lint/no-unvalidated-req-json.fixture.ts"],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    // Service-role Supabase client must not appear in public RSC routes —
    // it bypasses RLS. Use createClient from @/lib/supabase/server (anon
    // with cookies) for any data a logged-out visitor should see. Admin /
    // API / account routes are exempt because they legitimately need
    // elevated access.
    //
    // Ratcheted to "error" in X-09b (PR #648) after the X-02..X-08 backlog
    // of ~17 public pages was cleared. The three remaining KEEP-ADMIN files
    // each carry a per-file eslint-disable-next-line annotation documenting
    // the exception category (see docs/audits/x-admin-backlog-decision-matrix.md).
    files: ["app/**/page.tsx", "app/**/layout.tsx", "app/**/route.ts"],
    ignores: ["app/admin/**", "app/api/**", "app/account/**"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@/lib/supabase/admin",
          message: "createAdminClient bypasses RLS and must not be used in public RSC pages or route handlers. Use createClient from @/lib/supabase/server instead. For legitimate exceptions add eslint-disable-next-line with a reason (see x-admin-backlog-decision-matrix.md).",
        }],
      }],
    },
  },
  {
    // C-08: forward guardrail for lib/* modules.
    //
    // All 43 lib/* modules that legitimately import createAdminClient were
    // audited and confirmed correct (C-06, PR #327). The five documented
    // exception categories are in CLAUDE.md § "Two Supabase clients".
    //
    // New lib/* files that import the admin client will fail lint-staged's
    // `--max-warnings 0` at commit time, prompting the author to either
    // switch to createClient() from @/lib/supabase/server or add a
    // `// eslint-disable-next-line no-restricted-imports -- <reason>`
    // comment documenting which exception category applies.
    //
    // Set as "warn" (not "error") because the 43 pre-audit modules are
    // legitimate and would otherwise generate noise in `npm run lint`.
    // The lint-staged gate is the enforcement point for new code.
    files: ["lib/**/*.ts", "lib/**/*.tsx"],
    ignores: ["lib/supabase/admin.ts"],
    rules: {
      "no-restricted-imports": ["warn", {
        paths: [{
          name: "@/lib/supabase/admin",
          message: "createAdminClient bypasses RLS. New lib/* helpers should use createClient from @/lib/supabase/server unless they serve anonymous paths, do cross-user queries, or bypass intentional deny-all RLS. See CLAUDE.md § 'Two Supabase clients' for the documented exception categories.",
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

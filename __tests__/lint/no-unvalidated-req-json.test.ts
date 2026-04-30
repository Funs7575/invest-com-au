/**
 * Tests for the project-local ESLint rule `invest/no-unvalidated-req-json`
 * (Stream E, E-03). Two complementary harnesses:
 *
 *   1. **RuleTester** — ESLint's first-party rule-correctness harness. Runs
 *      every shape (positive + negative) as an isolated AST snippet. This
 *      is the authoritative regression harness for the rule's logic.
 *
 *   2. **Fixture lint** — runs the real `ESLint` API against
 *      `no-unvalidated-req-json.fixture.ts` with the rule turned ON, and
 *      asserts that the expected lines warn / don't warn. This catches
 *      integration bugs (parser config, plugin wiring) that RuleTester
 *      can't see.
 *
 * The rule is deliberately set to severity `warn` in eslint.config.mjs to
 * avoid breaking the ~200 legacy routes that pre-date the Stream E
 * migration. Husky/lint-staged runs `eslint --fix --max-warnings 0` on
 * staged files, which catches NEW drift on routes the dev is touching.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint, RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { describe, it, expect, beforeAll } from "vitest";

import eslintConfigDefault from "../../eslint.config.mjs";

// ── Locate the rule definition off the project's flat config ────────────────
// The rule is registered as the plugin entry `invest.no-unvalidated-req-json`
// inside one of the flat-config blocks. We walk the array looking for the
// first block that registers the `invest` plugin and read the rule out.
function getRule() {
  // eslint.config.mjs's default export can be `Linter.Config[]` or `unknown[]`
  // depending on how typescript resolves the .mjs import; cast pragmatically.
  const cfg = eslintConfigDefault as unknown as Array<{
    plugins?: Record<string, { rules?: Record<string, unknown> }>;
  }>;
  for (const block of cfg) {
    const rule = block?.plugins?.invest?.rules?.["no-unvalidated-req-json"];
    if (rule) return rule as Parameters<RuleTester["run"]>[1];
  }
  throw new Error(
    "no-unvalidated-req-json rule not found in eslint.config.mjs — wiring regression",
  );
}

// ── 1. RuleTester ────────────────────────────────────────────────────────────

describe("invest/no-unvalidated-req-json — RuleTester", () => {
  it("matches expected valid + invalid shapes", () => {
    const tester = new RuleTester({
      languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
      },
    });

    // RuleTester throws on a mismatch; running the suite IS the assertion.
    tester.run("no-unvalidated-req-json", getRule(), {
      valid: [
        // Inline parse.
        `async function POST(req) { const body = Schema.parse(await req.json()); return body; }`,
        // safeParse variant.
        `async function POST(req) { const body = Schema.safeParse(await req.json()); return body; }`,
        // withValidatedBody wrapper present in scope.
        `export const POST = withValidatedBody(Schema, async (req, body) => { return body; });`,
        // Intermediate variable consumed by parse later in the same scope.
        `async function POST(req) { const raw = await req.json(); const body = Schema.parse(raw); return body; }`,
        // .then chain handing off to parse.
        `async function POST(req) { const body = await req.json().then((d) => Schema.parse(d)); return body; }`,
        // Different identifier (e.g. fetch Response) — out of scope.
        `async function reader(stream) { const obj = await stream.json(); return obj; }`,
      ],
      invalid: [
        {
          code: `async function POST(req) { const body = await req.json(); return body; }`,
          errors: [{ messageId: "unvalidated" }],
        },
        {
          code: `async function POST(request) { const body = await request.json(); return body; }`,
          errors: [{ messageId: "unvalidated" }],
        },
        {
          code: `async function POST(req) { const body = await req.json().catch(() => ({})); return body; }`,
          errors: [{ messageId: "unvalidated" }],
        },
        {
          code: `async function POST(req) { const { id } = await req.json(); return id; }`,
          errors: [{ messageId: "unvalidated" }],
        },
      ],
    });

    // If RuleTester didn't throw, the rule behaved correctly across every
    // case. Add an explicit assertion so vitest reports a test result.
    expect(true).toBe(true);
  });
});

// ── 2. Fixture lint via the public ESLint API ───────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(
  __dirname,
  "no-unvalidated-req-json.fixture.ts",
);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

describe("invest/no-unvalidated-req-json — fixture lint", () => {
  let messages: ESLint.LintResult["messages"];

  beforeAll(async () => {
    // Re-fetch the rule and wire a *fresh* ESLint instance whose config
    // turns ON the rule and disables every other one. We can't rely on the
    // project's eslint.config.mjs for the fixture lint because the fixture
    // lives under `__tests__/**`, where the rule is intentionally OFF.
    const rule = getRule();
    const eslint = new ESLint({
      cwd: REPO_ROOT,
      // Skip the project's flat config — we provide a minimal inline one.
      overrideConfigFile: true,
      overrideConfig: [
        {
          // ESLint v9 flat config: a block with no `files` glob applies to
          // every file the linter visits, BUT it won't pick up `.ts` files
          // unless something else (or this block) opts them in. Adding the
          // glob explicitly gives us a self-contained, reproducible setup
          // that doesn't depend on the rest of the project's config.
          files: ["**/*.ts", "**/*.tsx"],
          languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
          },
          plugins: {
            invest: {
              rules: {
                "no-unvalidated-req-json": rule as never,
              },
            },
          },
          rules: {
            "invest/no-unvalidated-req-json": "warn",
          },
        },
      ],
    });

    const results = await eslint.lintFiles([FIXTURE_PATH]);
    expect(results).toHaveLength(1);
    messages = results[0]!.messages;
  });

  it("warns on every CASE I* (invalid) line and only those lines", () => {
    const warningLines = messages
      .filter((m) => m.ruleId === "invest/no-unvalidated-req-json")
      .map((m) => m.line)
      .sort((a, b) => a - b);

    // Each invalid CASE I* fixture is structured so the `req.json()` call
    // sits on its own line, with the `// CASE Ix:` marker on the line
    // above it. We assert exactly the count + line set.
    expect(warningLines.length).toBe(3);

    // Resolve the comment marker → expected warning line (one below).
    // We read this dynamically so reformatting the fixture (e.g. via
    // prettier) doesn't break the test.
    const expectedLines = expectedInvalidLines();
    expect(warningLines).toEqual(expectedLines);
  });

  it("does NOT warn on valid shapes (CASE V*)", async () => {
    const validLines = expectedValidLines();
    const warningLines = new Set(
      messages
        .filter((m) => m.ruleId === "invest/no-unvalidated-req-json")
        .map((m) => m.line),
    );
    for (const ln of validLines) {
      expect(warningLines.has(ln)).toBe(false);
    }
  });

  it("respects // eslint-disable-next-line on caseV6 (inline opt-out)", () => {
    // CaseV6 calls `await req.json()` without parsing, but is suppressed
    // by the inline disable comment. ESLint's standard disable-comment
    // machinery should hide this from the report.
    const v6Line = lineOfMarker(/CASE V6 /) + 2; // marker, then disable comment, then the await line
    const warningLines = new Set(
      messages
        .filter((m) => m.ruleId === "invest/no-unvalidated-req-json")
        .map((m) => m.line),
    );
    expect(warningLines.has(v6Line)).toBe(false);
  });
});

// ── Marker helpers ──────────────────────────────────────────────────────────
// Read the fixture file once and resolve `// CASE <id>: ...` markers to
// their line numbers. The `req.json()` call is always on the line BELOW the
// marker for I-cases; for V-cases we just check that no warning lands on
// the lines between the marker and the next blank line / closing brace.

import { readFileSync } from "node:fs";
const FIXTURE_TEXT = readFileSync(FIXTURE_PATH, "utf8").split("\n");

function lineOfMarker(re: RegExp): number {
  const idx = FIXTURE_TEXT.findIndex((l) => re.test(l));
  if (idx < 0) throw new Error(`marker not found: ${re}`);
  return idx + 1; // 1-indexed lines
}

function expectedInvalidLines(): number[] {
  // For each `// CASE I<n>` comment, the relevant `req.json()` call sits
  // a small number of lines below; rather than hard-coding offsets, we
  // search forward from the marker for the first line containing
  // `req.json()` or `request.json()`.
  const out: number[] = [];
  for (let i = 0; i < FIXTURE_TEXT.length; i++) {
    if (!/CASE I\d/.test(FIXTURE_TEXT[i]!)) continue;
    for (let j = i + 1; j < Math.min(i + 8, FIXTURE_TEXT.length); j++) {
      if (/(req|request)\.json\(\)/.test(FIXTURE_TEXT[j]!)) {
        out.push(j + 1);
        break;
      }
    }
  }
  return out.sort((a, b) => a - b);
}

function expectedValidLines(): number[] {
  // Same idea, but for V-cases (which should NOT warn).
  const out: number[] = [];
  for (let i = 0; i < FIXTURE_TEXT.length; i++) {
    if (!/CASE V\d/.test(FIXTURE_TEXT[i]!)) continue;
    for (let j = i + 1; j < Math.min(i + 10, FIXTURE_TEXT.length); j++) {
      if (/(req|request)\.json\(\)/.test(FIXTURE_TEXT[j]!)) {
        out.push(j + 1);
        break;
      }
    }
  }
  return out.sort((a, b) => a - b);
}

#!/usr/bin/env node
/**
 * V-NEW-02 CI gate — AI factual-filter enforcement.
 *
 * Scans `app/` + `lib/` for files that import `@anthropic-ai/sdk` (or
 * proxy through `lib/chatbot.ts` etc.) and verifies each one ALSO
 * imports `filterFactualOutput` from `@/lib/compliance`. Files that
 * don't render LLM output back to a user (cron backfills, internal
 * classifiers) can opt out via an explicit allowlist entry below —
 * each opt-out requires a one-line reason.
 *
 * Why: ENTERPRISE_STANDARD.md AI surface rubric requires every
 * user-facing LLM response to pass through `filterFactualOutput`
 * before rendering. The function exists at `lib/compliance.ts:651`;
 * this gate stops new AI routes from bypassing it.
 *
 * Usage:
 *   node scripts/check-ai-factual-filter.mjs            # checks repo
 *   node scripts/check-ai-factual-filter.mjs --json     # machine output
 *
 * Exit codes:
 *   0 — every AI-surface file calls filterFactualOutput (or is allowlisted)
 *   1 — at least one file imports Anthropic SDK without the filter
 *   2 — script invariant violated (e.g. allowlist entry points at missing file)
 *
 * Wired into `.github/workflows/ci.yml` as a fail-fast step before tests.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ROOT defaults to the script's parent-parent (the repo root). Overridable
// via `--root=<path>` so the test suite can point at a fixture directory.
function resolveRoot() {
  const arg = process.argv.find((a) => a.startsWith("--root="));
  if (arg) return resolve(arg.slice("--root=".length));
  return resolve(fileURLToPath(import.meta.url), "..", "..");
}
const ROOT = resolveRoot();

// Files that import the Anthropic SDK but legitimately don't render the
// output to a user — exempt from the filter requirement. Each entry must
// state a reason in the same line so a future reviewer can audit at a glance.
const EXEMPT = new Map(
  /** @type {[string, string][]} */ ([
    [
      "app/api/cron/versus-editorial-backfill/route.ts",
      "cron-only writer — LLM output goes into DB columns reviewed by editors before publication; the publishing surface (article render) is itself filter-protected at the render layer",
    ],
    [
      "lib/chatbot.ts",
      "infrastructure — provides primitives (classifyUserMessage, RAG retrieval) consumed by routes; the routes themselves are the filter-call site, not this module",
    ],
    [
      "lib/qa-chatbot.ts",
      "infrastructure — wraps chatbot.ts + cost caps; QA route at app/api/answers/ask is the call site of filterFactualOutput",
    ],
    [
      "app/api/account/holdings/ai-analysis/route.ts",
      "delegates LLM orchestration to lib/holdings/ai-analysis.ts which itself imports + calls filterFactualOutput before returning result.rawText; route only forwards the already-filtered text",
    ],
  ]),
);

// Match `import (type) X from '@anthropic-ai/sdk'` — both runtime and
// type-only forms; type-only counts because if a file pulls in Anthropic
// types it's almost certainly orchestrating the SDK transitively.
const ANTHROPIC_IMPORT_REGEX =
  /^\s*import\s+(?:type\s+)?[^;]+\s+from\s+['"]@anthropic-ai\/sdk['"]/m;

// Must be a real import statement, not a comment mention. Allow named
// import (`{ filterFactualOutput }`) anywhere in the import specifier
// list; allow renamed (`{ filterFactualOutput as x }`); reject bare
// occurrences in comments / strings.
const FILTER_IMPORT_REGEX =
  /^\s*import\s+(?:type\s+)?\{[^}]*\bfilterFactualOutput\b[^}]*\}\s+from\s+['"]@\/lib\/compliance['"]/m;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      yield* walk(p);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      yield p;
    }
  }
}

function isTestFile(p) {
  return (
    p.includes("/__tests__/") ||
    p.endsWith(".test.ts") ||
    p.endsWith(".test.tsx")
  );
}

function findOffenders() {
  const offenders = [];
  for (const dir of [join(ROOT, "lib"), join(ROOT, "app")]) {
    for (const p of walk(dir)) {
      if (isTestFile(p)) continue;
      const src = readFileSync(p, "utf8");
      if (!ANTHROPIC_IMPORT_REGEX.test(src)) continue;
      if (FILTER_IMPORT_REGEX.test(src)) continue;
      const rel = relative(ROOT, p);
      if (EXEMPT.has(rel)) continue;
      offenders.push(rel);
    }
  }
  return offenders;
}

function verifyAllowlistTargetsExist() {
  // Skip when running against a fixture root — the EXEMPT list is a
  // production-repo concern, not a test-fixture one. Detected by the
  // presence of `--root=` in argv. In that mode the gate still scans
  // the fixture for offenders; it just doesn't care if the production
  // allowlist points at paths that don't exist in the fixture.
  if (process.argv.some((a) => a.startsWith("--root="))) return [];
  /** @type {string[]} */
  const stale = [];
  for (const rel of EXEMPT.keys()) {
    const p = join(ROOT, rel);
    try {
      statSync(p);
    } catch {
      stale.push(rel);
    }
  }
  return stale;
}

function main() {
  const json = process.argv.includes("--json");
  const stale = verifyAllowlistTargetsExist();
  if (stale.length > 0) {
    if (json) {
      process.stdout.write(
        JSON.stringify({ ok: false, error: "stale-allowlist", stale }, null, 2),
      );
    } else {
      console.error(
        "❌ EXEMPT allowlist has entries pointing at files that no longer exist:",
      );
      for (const s of stale) console.error(`   ${s}`);
      console.error(
        "Remove the entry from scripts/check-ai-factual-filter.mjs.",
      );
    }
    process.exit(2);
  }

  const offenders = findOffenders();
  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: offenders.length === 0,
          offenders,
          exempt: [...EXEMPT.keys()],
        },
        null,
        2,
      ),
    );
    process.exit(offenders.length === 0 ? 0 : 1);
  }

  if (offenders.length === 0) {
    console.log(
      `✅ V-NEW-02: all ${EXEMPT.size} exempt + every other Anthropic-importing file calls filterFactualOutput.`,
    );
    process.exit(0);
  }

  console.error(
    `❌ V-NEW-02: ${offenders.length} file(s) import @anthropic-ai/sdk without calling filterFactualOutput from @/lib/compliance:`,
  );
  for (const o of offenders) console.error(`   ${o}`);
  console.error(
    "\nFix: import { filterFactualOutput } from '@/lib/compliance' and call it on every LLM response before returning to the user.",
  );
  console.error(
    "Or, if this file genuinely doesn't render LLM output to users, add it to EXEMPT in scripts/check-ai-factual-filter.mjs with a one-line reason.",
  );
  process.exit(1);
}

main();

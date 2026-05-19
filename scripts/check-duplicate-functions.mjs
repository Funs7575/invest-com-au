#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Duplicate-function detector — lib-shadow variant.
 *
 * Catches the pattern that produced 10 copies of formatDate before F-02:
 * a helper exists as an export in lib/, but other files redefine it locally
 * instead of importing it.
 *
 * Strategy:
 *   1. Index every exported function / const-arrow / class in lib/.
 *   2. Scan app/, components/, hooks/ for redefinitions of the same name.
 *   3. Report each lib/ export that's redefined elsewhere.
 *
 * This is intentionally narrower than a generic dup-code detector: local
 * helpers (`load`, `handleClick`, file-scoped `format`) legitimately repeat;
 * the real smell is "this thing already exists in lib/, why did you rewrite it?"
 *
 * Heuristic-only — no AST. Recognises:
 *   export function foo(            )
 *   export async function foo(      )
 *   export const foo = (            )
 *   export const foo = async (      )
 *   export class Foo                 (still flags PascalCase classes)
 * For redefinitions, also matches non-exported `function foo(` / `const foo =`.
 *
 * Skips:
 *   - Single-letter / very short names (<4 chars)
 *   - React components (PascalCase) and hooks (useFoo) — except classes
 *   - Framework-reserved names (page, layout, GET, POST, default, etc.)
 *
 * Usage:
 *   npm run audit:duplicate-functions
 *   node scripts/check-duplicate-functions.mjs
 *
 * Exit codes:
 *   0  no shadowed lib/ exports
 *   1  one or more shadowed exports found
 *
 * Allowlist:
 *   Add the function name to ALLOWED_NAMES with a comment explaining why.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const LIB_ROOT = "lib";
const SCAN_ROOTS = ["app", "components", "hooks"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  ".vercel",
  "__tests__",
  "tests",
  "e2e",
]);
const EXTS = new Set([".ts", ".tsx"]);

const FRAMEWORK_NAMES = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "notFound",
  "generateMetadata",
  "generateStaticParams",
  "generateViewport",
  "default",
  "middleware",
  "handler",
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
  "config",
  "metadata",
]);

const ALLOWED_NAMES = new Set([
  // Add deliberately-shadowed lib exports here, with a comment.

  // app/api/advisor-lead/route.ts: sendAdminNotification(name, phone, email, advisorType,
  // quizAnswers, intlContext?) — route-specific rich-HTML lead-notification email.
  // lib/advisor-emails.ts: sendAdminNotification(subject, body) — generic email helper.
  // Completely different signatures and purposes; replacing would break both.
  "sendAdminNotification",

  // app/api/cron/investor-drip/route.ts: welcomeEmail(name) — cron-local HTML template
  // that evolved independently from lib/email-templates.ts welcomeEmail(name).
  // Same signature, different template content. Consolidation is a product decision
  // (whether both templates should converge), not a mechanical refactor.
  "welcomeEmail",

  // app/go/[slug]/route.ts: isRateLimited(ip) — synchronous, in-memory per-instance
  // rate limiter (30 req / 60 s). lib/rate-limit.ts: isRateLimited() is async and
  // DB-backed. Affiliate redirect is latency-critical; DB round-trip is unacceptable.
  "isRateLimited",

  // app/versus/VersusClient.tsx: addSlot() — React callback that appends an empty slug
  // to the compare-UI selectedSlugs state array. lib/advisor-booking.ts: addSlot(input)
  // is an async DB insert that creates a booking availability slot. Same name, unrelated
  // domains; false-positive from the heuristic scan.
  "addSlot",

  // 8 UI files: remove(id) / remove(index) — React state callbacks (setState(prev =>
  // prev.filter(...))).  lib/saved-searches.ts: remove(id) is async and deletes from DB.
  // Same name, opposite domains; false-positive.
  "remove",

  // 7 files: formatCurrency(n) — AUD-only, takes a plain dollar number.
  // lib/currency.ts: formatCurrency(cents, currency, locale) — multi-currency, takes
  // cents. Different units and call sites; swapping would break output.
  "formatCurrency",

  // 7 files: slugify() — each uses a locally-tuned regex or 80-char truncation that
  // diverges from lib/utils.ts slugify() (different character sets, no truncation cap).
  // Behavioural difference is intentional in those contexts.
  "slugify",

  // 6 files (cron routes): sendEmail(to, subject, html) — positional-arg wrappers
  // around Resend calls.  lib/resend.ts: sendEmail(opts: SendEmailOptions) — options
  // object with extra fields (tags, bcc, replyTo). Different call shapes; not
  // mechanically substitutable without rewriting every call site.
  "sendEmail",

  // 5 files: update() — React state setters (setState(prev => ({...prev, ...patch}))).
  // lib/saved-searches.ts: update(id, patch) is async and writes to DB. False-positive.
  "update",

  // 4 files: formatAUD(cents) — divides by 100 before formatting; used in
  // broker-portal invoices where the DB stores amounts in cents.
  // lib/currency.ts: formatAUD(dollars) — takes dollars directly. Different units;
  // swapping would double-divide amounts already in the DB.
  "formatAUD",

  // 3 calculator files: storeQualificationData(data) — single-arg wrapper that
  // hard-codes the source key locally.
  // lib/qualification-store.ts: storeQualificationData(source, data) — two args.
  // Different signatures; callers omit the source argument by design.
  "storeQualificationData",

  // 2 files: truncate() — admin/moderation truncates by line count; bug-report
  // truncates by char count with a different param name.
  // lib/holdings/csv-import/_utils.ts: truncate(s, max=200) truncates by char count
  // with a default.  Different semantics between the two local versions and the lib.
  "truncate",

  // 2 files: formatDate(iso: string) — simplified renderers that take only an ISO
  // string.  lib/utils.ts: formatDate(iso?, {style?, fallback?}) — complex overload.
  // Locals don't pass options; the lib's defaults differ from the local formatting
  // used in those files.
  "formatDate",

  // app/admin/ai-assistant/page.tsx: sendMessage(text) — React event handler that
  // POSTs to the AI assistant endpoint. lib/brief-messages/index.ts: sendMessage() is
  // an async DB insert into brief_messages. Unrelated domains.
  "sendMessage",

  // app/admin/placement-experiments/PlacementExperimentsEditor.tsx: setStatus(row,
  // status) — local React handler calling a fetch PATCH. lib/disputes/index.ts:
  // setStatus() is an async DB operation on disputes. Different tables and domains.
  "setStatus",

  // app/advisor-portal/teams/TeamsManagerClient.tsx: submitForVerification() — no-arg
  // UI handler that calls fetch. lib/expert-teams.ts: submitForVerification(teamId)
  // is an async DB update. Different signatures and contexts.
  "submitForVerification",

  // app/api/cron/country-rule-alerts-digest/route.ts: renderDigestHtml(alerts, now)
  // — renders a country-alert digest email. lib/pro-digest/index.ts: renderDigestHtml
  // (input: {…}) renders a professional weekly digest. Different templates, different
  // input shapes, different purposes.
  "renderDigestHtml",

  // app/api/cron/country-rule-alerts-digest/route.ts: isKnownIntentCountry(code) —
  // checks against a local KNOWN_INTENT_CODES Set<IntentCountryCode>.
  // lib/intent-context.ts: isKnownIntentCountry(value) checks via hasOwnProperty on
  // the KNOWN object (security-hardened). Same type-guard shape but different backing
  // data structure; not a drop-in replacement without removing the local Set.
  "isKnownIntentCountry",

  // app/api/pro-affiliate/[token]/route.ts: hashIp(ip) — sha256(ip).slice(0,32),
  // no salt.  lib/article-comments.ts: hashIp(ip) — sha256(ip + IP_HASH_SALT).
  // Different outputs; swapping would invalidate hashes already stored in the DB
  // under the no-salt format.
  "hashIp",

  // app/api/quiz-lead/route.ts: inferVertical(a: UnifiedAnswers | undefined): string |
  // null — quiz-lead-specific inference over UnifiedAnswers shape.
  // lib/getmatched/inference.ts: inferVertical(answers: ActionPlanAnswers): Vertical |
  // null — takes a different input type and returns a typed enum. Not substitutable.
  "inferVertical",

  // app/questions/page.tsx: groupByCategory(questions) — groups FAQ Question rows by
  // their category string. lib/country-schemes.ts: groupByCategory(schemes) — groups
  // CountryScheme rows by SchemeCategory. Same name, unrelated input/output types.
  "groupByCategory",

  // app/quiz/page.tsx: inferAdvisorType(a: UnifiedAnswers): string — returns a plain
  // string. lib/getmatched/inference.ts: inferAdvisorType(answers: ActionPlanAnswers):
  // AdvisorType — different input type and return type. Not substitutable.
  "inferAdvisorType",

  // components/SmartRecommendationsStrip.tsx defines lightweight local rankBrokers,
  // rankAdvisors, and scoreAdvisor functions that score using only rating + a small
  // profile heuristic.  The lib/ versions (lib/compare-engine.ts, lib/advisor-ranker.ts)
  // take different input types (CostInputs, full AdvisorForRanking<T>) and implement
  // full pricing/availability scoring. Not substitutable — the strip deliberately
  // uses a simplified ranker for performance and to avoid importing heavy deps.
  "rankBrokers",
  "rankAdvisors",
  "scoreAdvisor",
]);

const EXPORT_PATTERNS = [
  /(?:^|\n)\s*export\s+(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[(<]/g,
  /(?:^|\n)\s*export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\(/g,
];

const REDEF_PATTERNS = [
  /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[(<]/g,
  /(?:^|\n)\s*(?:export\s+)?const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\(/g,
];

/** @param {string} name @returns {boolean} */
function shouldSkipName(name) {
  if (name.length < 4) return true;
  if (FRAMEWORK_NAMES.has(name)) return true;
  if (ALLOWED_NAMES.has(name)) return true;
  if (/^[A-Z]/.test(name)) return true; // components / classes — out of scope
  if (/^use[A-Z]/.test(name)) return true; // hooks
  return false;
}

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(p)));
    } else if (e.isFile() && EXTS.has(path.extname(e.name))) {
      out.push(p);
    }
  }
  return out;
}

/**
 * @param {string} text
 * @param {RegExp[]} patterns
 * @returns {Set<string>}
 */
function extractNames(text, patterns) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      if (!shouldSkipName(name)) names.add(name);
    }
  }
  return names;
}

async function main() {
  // 1. Index lib/ exports → name → defining file
  /** @type {Map<string, string>} */
  const libExports = new Map();
  const libFiles = await walk(path.join(process.cwd(), LIB_ROOT));
  for (const f of libFiles) {
    const rel = path.relative(process.cwd(), f);
    const text = await fs.readFile(f, "utf8");
    const names = extractNames(text, EXPORT_PATTERNS);
    for (const name of names) {
      if (!libExports.has(name)) libExports.set(name, rel);
    }
  }

  // 2. Scan SCAN_ROOTS for any definition (exported or local) matching a lib name
  /** @type {Map<string, {libFile: string, redefiners: Set<string>}>} */
  const shadows = new Map();

  for (const root of SCAN_ROOTS) {
    const abs = path.join(process.cwd(), root);
    const files = await walk(abs);
    for (const f of files) {
      const rel = path.relative(process.cwd(), f);
      const text = await fs.readFile(f, "utf8");
      const names = extractNames(text, REDEF_PATTERNS);
      for (const name of names) {
        const libFile = libExports.get(name);
        if (!libFile) continue;
        let entry = shadows.get(name);
        if (!entry) {
          entry = { libFile, redefiners: new Set() };
          shadows.set(name, entry);
        }
        entry.redefiners.add(rel);
      }
    }
  }

  /** @type {Array<{name: string, libFile: string, redefiners: string[]}>} */
  const findings = [];
  for (const [name, { libFile, redefiners }] of shadows) {
    findings.push({ name, libFile, redefiners: [...redefiners].sort() });
  }
  findings.sort((a, b) => b.redefiners.length - a.redefiners.length);

  if (findings.length === 0) {
    console.log(
      "Duplicate-function sweep passed — no lib/ export is shadowed by a redefinition in app/components/hooks."
    );
    process.exit(0);
  }

  console.error(
    `\n::error::Duplicate-function sweep found ${findings.length} lib/ export(s) shadowed by redefinitions.\n`
  );
  for (const { name, libFile, redefiners } of findings) {
    console.error(`  ✗  ${name}  (exported from ${libFile})`);
    console.error(`       redefined in ${redefiners.length} file(s):`);
    for (const r of redefiners) console.error(`         ${r}`);
  }
  console.error(
    "\nFix: replace the local definition with `import { <name> } from '@/<lib-path>'`."
  );
  console.error(
    "If shadowing is genuinely intentional, add the name to ALLOWED_NAMES in this script with a comment."
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-duplicate-functions: unexpected error:", err);
    process.exit(1);
  });
}

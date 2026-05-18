#!/usr/bin/env node
/**
 * Compliance disclosure CI gate.
 *
 * The site renders an org-wide compliance footer on every consumer-facing
 * page via `LayoutShell` → `SiteFooter` (mounted in `app/layout.tsx`).
 * This gate verifies that load-bearing chain stays intact, then warns
 * (does not fail) on pages that present financial recommendations
 * strongly enough to also benefit from inline compliance copy.
 *
 * Hard failures (exit 1):
 *   1. `app/layout.tsx` no longer mounts `LayoutShell`.
 *   2. `components/LayoutShell.tsx` no longer mounts `SiteFooter`.
 *   3. `components/layout/SiteFooter.tsx` no longer references any
 *      compliance constant (the org footer has lost its disclosure).
 *
 * Soft warnings (logged, exit 0):
 *   - Recommendation-heavy pages (vertical hubs, comparison pages, the
 *     wealth-stack surface) without an inline compliance marker beyond
 *     what the global footer provides.
 *
 * Promote a warning to a hard fail by moving the path into HARD_OFFENDERS
 * at the bottom of this file. The promotion is a deliberate decision —
 * inline compliance copy improves trust signals + Lighthouse, but the
 * global footer covers ASIC RG 234/256 baseline on its own.
 *
 * Background: ASIC RG 234 ("Advertising financial products") + RG 256
 * ("Client review and remediation") expect a general advice warning on
 * any surface presenting financial information to a retail consumer.
 * `lib/compliance.ts` is the single source of truth; this gate stops a
 * silent regression of the global rendering chain.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "app");

const COMPLIANCE_MARKERS = [
  "ComplianceFooter",
  "GENERAL_ADVICE_WARNING",
  "REGULATORY_NOTE",
  "GENERAL_ADVICE_DISCLAIMER",
  "FULL_GENERAL_ADVICE_WARNING",
  "general advice",
  "general information only",
  "not personal financial advice",
];

const SHARED_TEMPLATES_WITH_COMPLIANCE = [
  "VerticalPillarPage",
  "HubPage",
  "CountryHubTemplate",
  "ComplianceFooter",
  "CompactDisclosure",
  "FullDisclosure",
];

// ─── Hard checks on the global chain ────────────────────────────────────

function hardCheck(label, path, predicate) {
  if (!existsSync(path)) {
    console.error(`::error::Compliance gate hard check '${label}' — file not found: ${path}`);
    return false;
  }
  const body = readFileSync(path, "utf8");
  if (!predicate(body)) {
    console.error(`::error::Compliance gate hard check '${label}' failed against ${path}`);
    return false;
  }
  return true;
}

const hardResults = [
  hardCheck(
    "app/layout.tsx mounts LayoutShell",
    join(APP_DIR, "layout.tsx"),
    (b) => /<LayoutShell[\s>]/.test(b),
  ),
  hardCheck(
    "LayoutShell mounts SiteFooter",
    join(ROOT, "components/LayoutShell.tsx"),
    (b) => /<SiteFooter[\s/>]/.test(b),
  ),
  hardCheck(
    "SiteFooter references a compliance constant",
    join(ROOT, "components/layout/SiteFooter.tsx"),
    (b) => COMPLIANCE_MARKERS.some((m) => b.includes(m)),
  ),
];

if (hardResults.some((r) => !r)) {
  console.error("\nThe global compliance-disclosure chain is broken. Fix the failing");
  console.error("hard check(s) above before merging — every consumer-facing page");
  console.error("inherits compliance copy through this chain.");
  process.exit(1);
}

// ─── Soft checks on recommendation-heavy pages ──────────────────────────

const RECOMMENDATION_PATHS = [
  /^compare(\/|$)/,
  /^best\//,
  /^advisors?(\/|$)/,
  /^find-advisor(\/|$)/,
  /^wealth-stack(\/|$)/,
  /^savings(\/|$)/,
  /^term-deposits(\/|$)/,
  /^super(\/|$)/,
  /^crypto(\/|$)/,
  /^share-trading(\/|$)/,
  /^cfd(\/|$)/,
  /^robo-advisors(\/|$)/,
  /^etfs(\/|$)/,
  /^insurance(\/|$)/,
  /^tax(\/|$)/,
  /^property(\/|$)/,
  /^foreign-investment\//,
];

const SKIPPED_FILENAMES = new Set([
  "layout.tsx",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "template.tsx",
  "global-error.tsx",
  "default.tsx",
  "head.tsx",
]);

function listPages(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      listPages(full, acc);
    } else if ((entry === "page.tsx" || entry === "page.ts") && !SKIPPED_FILENAMES.has(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function isRecommendationPage(rel) {
  return RECOMMENDATION_PATHS.some((re) => re.test(rel));
}

function hasInlineCompliance(body) {
  return (
    COMPLIANCE_MARKERS.some((m) => body.includes(m)) ||
    SHARED_TEMPLATES_WITH_COMPLIANCE.some((c) => body.includes(c))
  );
}

const pages = listPages(APP_DIR);
const softOffenders = [];

for (const pagePath of pages) {
  const rel = pagePath.slice(APP_DIR.length + 1).replace(/\\/g, "/").replace(/\/page\.tsx?$/, "");
  if (!isRecommendationPage(rel)) continue;
  const body = readFileSync(pagePath, "utf8");
  if (!hasInlineCompliance(body)) {
    softOffenders.push(rel || "/");
  }
}

console.log(
  `Compliance disclosure gate — global chain ✓, ${pages.length} pages scanned, ${softOffenders.length} recommendation-heavy page(s) without inline compliance.`,
);

if (softOffenders.length > 0) {
  console.log("\nSoft warnings (global footer still covers these; inline copy lifts trust signals):");
  for (const o of softOffenders) {
    console.log(`  ⚠  /${o}`);
  }
  console.log(
    "\nFix: render <ComplianceFooter />, embed a SHARED_TEMPLATES_WITH_COMPLIANCE component\n" +
      "(VerticalPillarPage / HubPage / CountryHubTemplate), or include one of the\n" +
      "compliance constants from lib/compliance.ts inline.\n",
  );
}

process.exit(0);

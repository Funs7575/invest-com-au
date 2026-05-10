#!/usr/bin/env node
// @ts-check
/**
 * JSON-LD coverage gate.
 *
 * Walks every `app/**\/page.tsx` route, classifies it as public-content vs
 * exempt (form / utility / portal / redirect / locale-fallback), and verifies
 * that public-content routes emit at least one structured-data block —
 * either a literal `<script type="application/ld+json">` tag or a wrapper
 * component / helper from the allowlists below that emits one transitively.
 *
 * Why it exists:
 *   Rich-snippet completeness drives SERP CTR. New public pages that ship
 *   without JSON-LD silently regress organic discoverability, and a manual
 *   audit re-discovers the same gaps every quarter. This gate catches the
 *   regression at PR time.
 *
 * What's enforced:
 *   - PUBLIC routes (everything not classified as EXEMPT) must emit JSON-LD.
 *   - The check fires on every PR via `.github/workflows/jsonld-coverage.yml`.
 *
 * What's NOT enforced:
 *   - Specific schema types per route. We require ≥1 JSON-LD block; the type
 *     correctness is up to the page author. Per-type checks were considered
 *     and rejected as too brittle (the same page legitimately ships several
 *     blocks; new schema.org types appear regularly).
 *
 * Adding an exemption:
 *   Update `EXEMPT_ROUTE_PATTERNS` with the route prefix and a one-line
 *   reason in the leading comment. No allowlist file; the source is the
 *   audit trail.
 *
 * Usage:
 *   node scripts/check-jsonld-coverage.mjs            # audit + exit non-zero on miss
 *   node scripts/check-jsonld-coverage.mjs --json     # machine-readable report
 *   node scripts/check-jsonld-coverage.mjs --verbose  # include OK pages
 */

import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import path from "node:path";

const APP_ROOT = "app";

/**
 * Wrapper components that themselves emit at least one JSON-LD block.
 * A page that mounts one of these is considered covered.
 */
const WRAPPER_COMPONENTS = [
  "HubPage",
  "VerticalPillarPage",
  "CountryHubTemplate",
  "ListingSchemaScripts",
  "ListingProductSchema",
  "ForeignInvestmentLocalizedPage",
  "ForeignInvestmentSubPage",
  "JsonLd",
];

/**
 * Helper functions in lib/json-ld.ts and lib/schema-markup.ts (and
 * lib/seo.ts breadcrumbJsonLd) that return JSON-LD payloads.
 * If a page calls one of these, it's considered covered — render-side is
 * the page author's responsibility but pages that import + invoke a
 * helper are verifiably emitting structured data.
 */
const SCHEMA_HELPER_NAMES = [
  "articleJsonLd",
  "articleLd",
  "articleAuthorJsonLd",
  "articleFaqJsonLd",
  "brokerProductLd",
  "brokerFinancialProductJsonLd",
  "advisorProfileLd",
  "advisorJsonLd",
  "breadcrumbLd",
  "breadcrumbJsonLd",
  "faqLd",
  "faqJsonLd",
  "reviewLd",
  "itemListJsonLd",
  "listingProductJsonLd",
  "calculatorJsonLd",
  "versusComparisonJsonLd",
  "governmentServiceJsonLd",
  "ORGANIZATION_JSONLD",
  "organizationLd",
];

/**
 * Route patterns that are NOT public-content. Each entry is a path prefix
 * relative to `app/` (no trailing slash) plus a category tag and a one-line
 * justification. Pages whose path startsWith any prefix are exempt.
 *
 * Categories:
 *   - PORTAL: authenticated portal surface (admin / advisor / broker / firm /
 *     marketplace / account / dashboard / shortlist / onboarding)
 *   - FORM: user-submission form whose primary purpose is data capture, not
 *     content surfacing (review forms, signup, complaints)
 *   - UTILITY: confirmation / unsubscribe / export / redirect-target pages
 *     that have no SEO surface
 *   - LEGAL: legal disclosures / privacy controls — no rich-snippet value;
 *     content is deliberately compact and standardized
 *   - INTERNAL: dev tools, preview routes, internal experiments
 *   - SALES: B2B sales/pricing pages aimed at advisors not consumers; no
 *     consumer-search demand
 */
const EXEMPT_ROUTE_PATTERNS = [
  // PORTAL
  { prefix: "admin", category: "PORTAL" },
  { prefix: "account", category: "PORTAL" },
  { prefix: "auth", category: "PORTAL" },
  { prefix: "onboarding", category: "PORTAL" },
  { prefix: "dashboard", category: "PORTAL" },
  { prefix: "advisor-portal", category: "PORTAL" },
  { prefix: "broker-portal", category: "PORTAL" },
  { prefix: "firm-portal", category: "PORTAL" },
  { prefix: "marketplace-portal", category: "PORTAL" },
  { prefix: "shortlist", category: "PORTAL" },
  { prefix: "invest/my-listings", category: "PORTAL" },
  // FORM
  { prefix: "advisor-signup", category: "FORM" },
  { prefix: "advisor-apply", category: "FORM" },
  { prefix: "broker-signup", category: "FORM" },
  { prefix: "marketplace/register", category: "FORM" },
  { prefix: "community/new", category: "FORM" },
  { prefix: "complaints/submit", category: "FORM" },
  { prefix: "review", category: "FORM" }, // /review/[token], /review/broker/[token]
  { prefix: "reviews/write", category: "FORM" },
  { prefix: "quotes", category: "FORM" }, // /quotes/[slug]/review
  { prefix: "feedback", category: "FORM" },
  { prefix: "find-advisor", category: "FORM" }, // interactive quiz; OG/metadata cover SERP
  { prefix: "quick-audit", category: "FORM" },
  { prefix: "quiz", category: "FORM" },
  // UTILITY
  { prefix: "newsletter/confirm", category: "UTILITY" },
  { prefix: "newsletter/unsubscribe", category: "UTILITY" },
  { prefix: "unsubscribe", category: "UTILITY" },
  { prefix: "export", category: "UTILITY" }, // /export/* are PDF/print routes
  { prefix: "go", category: "UTILITY" }, // /go/[slug]/apply is an outbound redirect handler
  { prefix: "preview", category: "INTERNAL" },
  { prefix: "dev", category: "INTERNAL" },
  { prefix: "api", category: "INTERNAL" }, // route handlers get caught here only if a page.tsx exists alongside
  // LEGAL — minimal SEO surface; standardized boilerplate
  { prefix: "fsg", category: "LEGAL" },
  { prefix: "legal", category: "LEGAL" },
  { prefix: "privacy/data-rights", category: "LEGAL" },
  { prefix: "accessibility", category: "LEGAL" },
  // SALES — B2B advisor-facing, low consumer search demand
  { prefix: "for-advisors", category: "SALES" },
  { prefix: "advertise", category: "SALES" },
];

/**
 * Routes that look exempt by prefix but actually need coverage. Empty for now;
 * keep as escape hatch for future false positives where a SALES/etc. prefix
 * does have rich-snippet value.
 */
const EXEMPT_OVERRIDE_PATTERNS = [];

/* ────────────────────────────────────────────────────────────────────────── */
/*  Helpers — exported for unit tests                                         */
/* ────────────────────────────────────────────────────────────────────────── */

/** Recursively list every `page.tsx` under `dir`. */
export async function listPageFiles(dir) {
  const out = [];
  /** @type {Array<import("node:fs").Dirent>} */
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listPageFiles(p)));
    } else if (entry.name === "page.tsx" || entry.name === "layout.tsx") {
      out.push(p);
    }
  }
  return out;
}

/**
 * Convert a filesystem page path (e.g. `app/article/[slug]/page.tsx`) to its
 * route prefix relative to `app/` (e.g. `article/[slug]`).
 */
export function routeOf(filePath) {
  const f = filePath.replaceAll("\\", "/");
  const m = f.match(/^app\/(.+)\/(page|layout)\.tsx$/);
  return m ? m[1] : "";
}

/**
 * Returns the matching exemption entry for a route, or null if the route
 * is public-content. The override list short-circuits a prefix match.
 */
export function findExemption(route) {
  const r = route + "/";
  for (const o of EXEMPT_OVERRIDE_PATTERNS) {
    if (r.startsWith(o.prefix + "/")) return null;
  }
  for (const p of EXEMPT_ROUTE_PATTERNS) {
    if (r.startsWith(p.prefix + "/")) return p;
  }
  return null;
}

/**
 * Returns true when the page metadata declares `robots.index: false` (or
 * the bare `noindex` directive in a literal robots string). Pages that
 * opt out of indexing don't need rich-snippet schema — search engines
 * won't surface them. The check is text-based so it picks up both the
 * inline metadata literal and the `Metadata`-typed object form.
 */
export function isNoIndex(body) {
  if (/\bindex\s*:\s*false\b/.test(body)) return true;
  if (/robots\s*:\s*["'`][^"'`]*\bnoindex\b/i.test(body)) return true;
  return false;
}

/**
 * Returns true when the file body is just a `redirect()` /
 * `permanentRedirect()` / standalone `notFound()`. These are routing
 * forwarders without rendered content; SEO is tracked at the destination.
 *
 * Heuristic: the file calls `redirect(...)` / `permanentRedirect(...)`
 * AND has no JSX return — i.e. nothing of the shape `return ( <` or
 * `return <` in the body. Pages with `generateMetadata`, allowlists,
 * etc. but no rendered output still qualify.
 */
export function isRedirectOnly(body) {
  const stripped = body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const hasRedirect =
    /\b(?:permanentRedirect|redirect)\(\s*[`"']/.test(stripped);
  const hasJsxReturn = /\breturn\s*\(?\s*</.test(stripped);
  if (hasRedirect && !hasJsxReturn) return true;
  // notFound-only pages (rare; the route exists to gate access on auth/etc.).
  const isNotFoundShim =
    /\bnotFound\(\s*\)/.test(stripped) &&
    !hasJsxReturn &&
    stripped.split("\n").length < 30;
  return isNotFoundShim;
}

/**
 * Returns true when the page body or one of its same-directory layouts emits
 * at least one JSON-LD block — directly via a `<script type="application/ld+json">`
 * tag, or transitively via a wrapper component / helper invocation from the
 * allowlists.
 */
export function emitsJsonLd(body) {
  if (body.includes("application/ld+json")) return true;
  for (const w of WRAPPER_COMPONENTS) {
    if (new RegExp(`<\\s*${w}[\\s/>]`).test(body)) return true;
  }
  for (const fn of SCHEMA_HELPER_NAMES) {
    if (new RegExp(`\\b${fn}\\s*\\(`).test(body)) return true;
  }
  return false;
}

/**
 * Read a page file plus its in-tree layouts (same directory and ancestor
 * directories up to `app/`). Layouts can emit JSON-LD that covers all
 * descendant pages — e.g. `/find-advisor/layout.tsx` covers the client page.
 */
export async function readPageBundle(pageFile) {
  const f = pageFile.replaceAll("\\", "/");
  const parts = f.split("/");
  const fragments = [await fs.readFile(pageFile, "utf8")];
  // Walk up the path emitting each `layout.tsx` between this page and `app/`.
  for (let i = parts.length - 1; i > 0; i--) {
    if (parts[i - 1] !== APP_ROOT && i - 1 > 0) {
      const dir = parts.slice(0, i).join("/");
      const layoutPath = `${dir}/layout.tsx`;
      try {
        fragments.push(await fs.readFile(layoutPath, "utf8"));
      } catch {
        // No layout at this level — skip.
      }
    }
  }
  return fragments.join("\n/* ----- layout-boundary ----- */\n");
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export async function audit() {
  const files = (await listPageFiles(APP_ROOT)).filter((f) =>
    f.endsWith("page.tsx"),
  );
  /** @type {{ public: number, exempt: Record<string, number>, redirect: number, noindex: number, missing: string[] }} */
  const report = { public: 0, exempt: {}, redirect: 0, noindex: 0, missing: [] };

  for (const file of files) {
    const route = routeOf(file);
    const exempt = findExemption(route);
    if (exempt) {
      report.exempt[exempt.category] = (report.exempt[exempt.category] || 0) + 1;
      continue;
    }
    const body = await fs.readFile(file, "utf8");
    if (isRedirectOnly(body)) {
      report.redirect++;
      continue;
    }
    if (isNoIndex(body)) {
      report.noindex++;
      continue;
    }
    report.public++;
    const bundle = await readPageBundle(file);
    if (!emitsJsonLd(bundle)) {
      report.missing.push(file.replaceAll("\\", "/"));
    }
  }
  return report;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const report = await audit();

  if (args.has("--json")) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exit(report.missing.length === 0 ? 0 : 1);
  }

  const totalExempt = Object.values(report.exempt).reduce(
    (a, b) => a + b,
    0,
  );
  console.log("JSON-LD coverage report");
  console.log("───────────────────────");
  console.log(`Public routes audited:         ${report.public}`);
  console.log(`Redirect-only (no SEO surface): ${report.redirect}`);
  console.log(`No-index (robots opt-out):      ${report.noindex}`);
  console.log(`Exempt by category:`);
  for (const [cat, n] of Object.entries(report.exempt)) {
    console.log(`  - ${cat.padEnd(10)} ${n}`);
  }
  console.log(`Exempt total:                   ${totalExempt}`);
  console.log("");

  if (report.missing.length === 0) {
    console.log("✅ All public routes emit JSON-LD.");
    process.exit(0);
  }

  console.log(`❌ ${report.missing.length} public route(s) missing JSON-LD:`);
  for (const m of report.missing) {
    console.log(`  - ${m}`);
  }
  console.log("");
  console.log("Fix: add a <script type=\"application/ld+json\"> block to the");
  console.log("page (use helpers from lib/json-ld.ts, lib/schema-markup.ts,");
  console.log("or lib/seo.ts breadcrumbJsonLd), OR mount one of the wrapper");
  console.log("components (HubPage, VerticalPillarPage, CountryHubTemplate).");
  console.log("");
  console.log("If the route is genuinely exempt, add it to");
  console.log("EXEMPT_ROUTE_PATTERNS in scripts/check-jsonld-coverage.mjs");
  console.log("with a category and one-line reason.");
  process.exit(1);
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}

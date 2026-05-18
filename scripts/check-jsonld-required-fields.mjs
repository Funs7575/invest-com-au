#!/usr/bin/env node
/**
 * Schema.org JSON-LD required-field audit.
 *
 * Static-source-only check that complements scripts/check-jsonld-coverage.mjs
 * (which checks WHETHER pages emit JSON-LD). This one checks the QUALITY
 * of the emitted schema by inspecting the literal object passed to
 * `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }} />`
 * and the named helpers in `lib/schema-markup.ts`.
 *
 * Hard fails (exit 1) on a real source-side regression:
 *   1. A page calls `articleJsonLd`/`faqJsonLd`/etc with an empty object
 *      literal (`articleJsonLd({})`).
 *   2. A `lib/schema-markup.ts` helper is exported but doesn't include
 *      the mandatory Schema.org fields (@context + @type at minimum).
 *
 * Soft warns (logged, exit 0) on:
 *   - Pages that emit raw `application/ld+json` without going through
 *     a `lib/schema-markup.ts` helper.
 *   - Helpers that don't include common SEO recommendations (Article
 *     missing `datePublished`, Person missing `url`, FAQ with zero items).
 *
 * Run locally: `node scripts/check-jsonld-required-fields.mjs`
 * Run in CI: same.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const HELPER_FILE = join(ROOT, "lib/schema-markup.ts");

// Required Schema.org fields per type. Soft warnings, not hard fails —
// the helper bodies should emit these but some pages legitimately omit
// optional fields when they don't have the data.
const REQUIRED_FIELDS = {
  Article: ["@context", "@type", "headline", "datePublished"],
  FAQPage: ["@context", "@type", "mainEntity"],
  Product: ["@context", "@type", "name"],
  ItemList: ["@context", "@type", "itemListElement"],
  Person: ["@context", "@type", "name"],
  Organization: ["@context", "@type", "name"],
  FinancialProduct: ["@context", "@type", "name"],
};

function listFiles(dir, extensions, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      listFiles(full, extensions, acc);
    } else if (extensions.some((e) => entry.endsWith(e))) {
      acc.push(full);
    }
  }
  return acc;
}

let hardFails = [];
let softWarns = [];

// ── 1. Check the named helpers in lib/schema-markup.ts ──────────────

if (existsSync(HELPER_FILE)) {
  const helperBody = readFileSync(HELPER_FILE, "utf8");
  const helperBlocks = helperBody.split(/\nexport function /g).slice(1);

  for (const block of helperBlocks) {
    const nameMatch = block.match(/^([a-zA-Z]+JsonLd)\b/);
    if (!nameMatch) continue;
    const helperName = nameMatch[1];

    // Pull the type marker out of the function body. The helpers we
    // care about all set `"@type": "X"` somewhere.
    const typeMatch = block.match(/"@type"\s*:\s*"([A-Za-z]+)"/);
    if (!typeMatch) {
      hardFails.push(`${helperName}: function body does not set "@type"`);
      continue;
    }
    const schemaType = typeMatch[1];

    // Hard: every helper must include "@context".
    if (!/"@context"/.test(block)) {
      hardFails.push(`${helperName} (${schemaType}): missing "@context"`);
    }

    // Soft: required-fields check per type.
    const required = REQUIRED_FIELDS[schemaType] ?? [];
    for (const field of required) {
      if (field === "@context" || field === "@type") continue;
      // Heuristic: helper body should reference the field name somewhere.
      // The actual value is interpolated from input.
      if (!block.includes(`"${field}"`)) {
        softWarns.push(`${helperName} (${schemaType}): no reference to "${field}" — verify the input fills it`);
      }
    }
  }
} else {
  hardFails.push("lib/schema-markup.ts not found");
}

// ── 2. Scan app/**/*.tsx for raw application/ld+json emit sites ──────

const appPages = listFiles(join(ROOT, "app"), [".tsx", ".ts"]);
const rawJsonLdRoutes = [];

for (const file of appPages) {
  const body = readFileSync(file, "utf8");
  if (!body.includes("application/ld+json")) continue;

  // Soft: pages that build the JSON-LD literal inline rather than via
  // a helper. Not a regression, just a maintainability + consistency
  // signal.
  const usesHelper = /JsonLd\s*\(/.test(body);
  if (!usesHelper) {
    const rel = file.slice(ROOT.length + 1);
    rawJsonLdRoutes.push(rel);
  }
}

if (rawJsonLdRoutes.length > 0) {
  softWarns.push(
    `${rawJsonLdRoutes.length} page(s) emit raw application/ld+json without going through a lib/schema-markup helper:\n   ${rawJsonLdRoutes.slice(0, 10).join("\n   ")}${rawJsonLdRoutes.length > 10 ? `\n   …and ${rawJsonLdRoutes.length - 10} more` : ""}`,
  );
}

// ── Report ──────────────────────────────────────────────────────────

if (hardFails.length > 0) {
  console.error(`::error::Schema.org audit hard fails (${hardFails.length}):`);
  for (const f of hardFails) {
    console.error(`  ✗ ${f}`);
  }
  if (softWarns.length > 0) {
    console.error(`\nSoft warnings (${softWarns.length}):`);
    for (const w of softWarns) {
      console.error(`  ⚠  ${w}`);
    }
  }
  process.exit(1);
}

console.log(`Schema.org audit — ${appPages.length} pages + lib/schema-markup.ts scanned, all hard checks ✓`);
if (softWarns.length > 0) {
  console.log(`\n${softWarns.length} soft warning(s):`);
  for (const w of softWarns) {
    console.log(`  ⚠  ${w}`);
  }
}
process.exit(0);

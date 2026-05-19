#!/usr/bin/env node
/**
 * Sitemap orphan audit.
 *
 * Compares the set of routes Next.js will generate from `app/**\/page.tsx`
 * against the set of paths declared in `app/sitemap.ts`, and flags
 * pages that exist but won't be indexed — Google deprioritises content
 * it can't crawl from internal links.
 *
 * Categorises pages into:
 *   - in sitemap (good)
 *   - explicitly noindexed via metadata.robots (intentional)
 *   - dynamic / catch-all routes that can't be enumerated statically
 *     (handled by the route at request time — soft skip)
 *   - orphans (the bad ones)
 *
 * Soft check — logs and exits 0. Run periodically; ratchet to hard
 * fail once the orphan count is at zero.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "app");

// Patterns we never expect to be in the sitemap.
const NEVER_INDEX_PATTERNS = [
  /^api\//,
  /^admin\//,
  /^advisor-portal\//,
  /^broker-portal\//,
  /^firm-portal\//,
  /^account\//,
  /^debug\//,
  /^auth\//,
  /^login/,
  /^logout/,
  /^signup/,
  /^forgot-password/,
  /^reset-password/,
  /^verify-email/,
  /^verify-otp/,
  /^magic-link/,
  /^_/,
  /^embed\//,
  /^pro\//, // gated content
  /^partner\//, // gated
  /^unsubscribe/,
];

function listPages(dir, prefix = "", acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip route groups in the path (Next.js convention: `(name)`).
      const segment = entry.startsWith("(") && entry.endsWith(")") ? "" : entry;
      const nextPrefix = segment ? `${prefix}${prefix ? "/" : ""}${segment}` : prefix;
      listPages(full, nextPrefix, acc);
    } else if (entry === "page.tsx" || entry === "page.ts") {
      acc.push({ route: `/${prefix}`, file: full });
    }
  }
  return acc;
}

function readSitemapPaths() {
  const file = join(APP_DIR, "sitemap.ts");
  if (!existsSync(file)) return new Set();
  const body = readFileSync(file, "utf8");

  // Extract every "/..." string literal that looks like a route. Dynamic
  // segments (e.g. /best/[slug]) appear as backtick template strings;
  // those are accumulated separately and matched as patterns.
  const literalRoutes = new Set();
  const literalMatches = body.match(/"\/[a-z0-9/_\-.[\]]*"/gi) ?? [];
  for (const m of literalMatches) {
    const path = m.slice(1, -1);
    literalRoutes.add(path);
  }

  return literalRoutes;
}

function isDynamicRoute(route) {
  return /\[[^\]]+\]/.test(route);
}

function isNeverIndexed(route) {
  const clean = route.startsWith("/") ? route.slice(1) : route;
  return NEVER_INDEX_PATTERNS.some((re) => re.test(clean));
}

function isExplicitlyNoindex(file) {
  const body = readFileSync(file, "utf8");
  return (
    /robots:\s*"noindex/.test(body) ||
    /robots:\s*\{\s*index:\s*false/.test(body) ||
    /robots:\s*\{\s*"index":\s*false/.test(body)
  );
}

const pages = listPages(APP_DIR);
const sitemapRoutes = readSitemapPaths();

const stats = {
  total: pages.length,
  inSitemap: 0,
  noindexExplicit: 0,
  neverIndex: 0,
  dynamic: 0,
  orphan: [],
};

for (const { route, file } of pages) {
  if (isNeverIndexed(route)) {
    stats.neverIndex++;
    continue;
  }
  if (isExplicitlyNoindex(file)) {
    stats.noindexExplicit++;
    continue;
  }
  if (isDynamicRoute(route)) {
    stats.dynamic++;
    continue;
  }
  if (sitemapRoutes.has(route) || sitemapRoutes.has(route === "/" ? "" : route.replace(/\/$/, ""))) {
    stats.inSitemap++;
    continue;
  }
  stats.orphan.push(route);
}

console.log(
  `Sitemap orphan audit — ${stats.total} app/* pages scanned:`,
);
console.log(`  ✓  ${stats.inSitemap} in sitemap`);
console.log(`  ⚪ ${stats.noindexExplicit} explicitly noindexed`);
console.log(`  ⚪ ${stats.neverIndex} non-indexable surface (admin/api/auth/account/etc)`);
console.log(`  ⚪ ${stats.dynamic} dynamic routes (handled at request time)`);
console.log(`  ⚠  ${stats.orphan.length} orphan(s)`);

if (stats.orphan.length > 0) {
  console.log("\nOrphan pages (exist in app/* but not in sitemap.ts and not noindexed):");
  for (const o of stats.orphan.slice(0, 50)) {
    console.log(`  ⚠  ${o}`);
  }
  if (stats.orphan.length > 50) {
    console.log(`  …and ${stats.orphan.length - 50} more`);
  }
  console.log(
    "\nFix options:\n" +
      "  1. Add the route to `staticPages` in app/sitemap.ts.\n" +
      "  2. Add `robots: { index: false, follow: true }` to its metadata if intentionally noindexed.\n" +
      "  3. If the route is utility/legal-only, add the path prefix to NEVER_INDEX_PATTERNS at\n" +
      "     the top of this script.\n",
  );
}

process.exit(0);

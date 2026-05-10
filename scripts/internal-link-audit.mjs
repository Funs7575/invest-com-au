#!/usr/bin/env node
/**
 * KK-01: Internal link audit — identify orphaned pages + over-linked hubs.
 *
 * Usage:
 *   node scripts/internal-link-audit.mjs
 *   node scripts/internal-link-audit.mjs --json   # machine-readable output
 *   node scripts/internal-link-audit.mjs --threshold 30  # orphan in-degree threshold
 *
 * Outputs:
 *   - Orphaned pages: in-degree = 0 (no other page links to them)
 *   - Over-linked hubs: out-degree > OVER_LINK_THRESHOLD outgoing links
 *   - Low-linked pages: in-degree = 1 (single inbound link — fragile)
 *   - Top 20 most-linked pages (in-degree ranking)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const APP_DIR = join(ROOT, "app");
const OVER_LINK_THRESHOLD = parseInt(
  process.argv.find((a) => a.startsWith("--threshold="))?.split("=")[1] ?? "25"
);
const JSON_OUTPUT = process.argv.includes("--json");

// ─── Discover all routes from app/**/page.tsx ───────────────────────────────

function routeFromPath(absPath) {
  const rel = relative(APP_DIR, absPath);
  // app/foo/bar/page.tsx → /foo/bar
  // app/page.tsx → /
  // app/(group)/foo/page.tsx → /foo  (route groups stripped)
  // app/[slug]/page.tsx → /[slug]
  const segments = rel
    .replace(/\/page\.tsx$/, "")
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith("("));
  return "/" + segments.join("/");
}

function collectPages(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      // skip node_modules, .next, __tests__
      if (["node_modules", ".next", "__tests__", ".git"].includes(e.name)) continue;
      collectPages(full, results);
    } else if (e.name === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

const pageFiles = collectPages(APP_DIR);
const allRoutes = new Set(pageFiles.map(routeFromPath));

// ─── Extract internal links from all .tsx files ─────────────────────────────

function collectTsx(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(e.name)) continue;
      collectTsx(full, results);
    } else if (e.name.endsWith(".tsx") || e.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

// Patterns that capture the literal string of an href / to prop pointing internally.
// Matches: href="/foo" href='/foo' href={"/foo"} href={`/foo`}
const HREF_RE =
  /(?:href|to)\s*=\s*(?:"(\/[^"]*?)"|'(\/[^']*?)'|\{["'`](\/[^"'`]*?)["'`]\})/g;

/** Normalize a raw href to a canonical route string, stripping query/hash. */
function normalizeHref(raw) {
  if (!raw) return null;
  // Strip query string and hash
  const clean = raw.split("?")[0].split("#")[0];
  // Ignore empty, external, or non-path hrefs
  if (!clean || !clean.startsWith("/")) return null;
  // Remove trailing slash (except root)
  return clean.length > 1 ? clean.replace(/\/$/, "") : clean;
}

const allTsx = collectTsx(join(ROOT, "app"));
// Also scan lib/ and components/ since they contain navigation components
allTsx.push(...collectTsx(join(ROOT, "lib")));
allTsx.push(...collectTsx(join(ROOT, "components")));

// inDegree[route] = Set of source files that link to it
// outDegree[sourceFile] = Set of target routes it links to
const inDegree = new Map(); // route → Set<sourceFile>
const outDegree = new Map(); // sourceFile → Set<route>

for (const route of allRoutes) {
  inDegree.set(route, new Set());
}

for (const file of allTsx) {
  const source = relative(ROOT, file);
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  const targets = new Set();
  let m;
  HREF_RE.lastIndex = 0;
  while ((m = HREF_RE.exec(content)) !== null) {
    const raw = m[1] ?? m[2] ?? m[3];
    const normalized = normalizeHref(raw);
    if (!normalized) continue;
    // Only count links to known routes (skip /api/*, /auth/*, dynamic segments we can't resolve)
    if (allRoutes.has(normalized)) {
      targets.add(normalized);
      inDegree.get(normalized)?.add(source);
    }
  }

  if (targets.size > 0) {
    outDegree.set(source, targets);
  }
}

// ─── Analysis ───────────────────────────────────────────────────────────────

// Exclude known special routes that are legitimately not linked (auth callbacks, cron, etc.)
const EXCLUDE_PREFIXES = [
  "/api/",
  "/auth/",
  "/admin/",
  "/_",
  "/account/",   // gated behind auth, nav link sufficient
];
const EXCLUDE_EXACT = new Set([
  "/",            // root is always in-degree 0 from other pages
  "/sitemap",
  "/robots",
]);

function isExcluded(route) {
  if (EXCLUDE_EXACT.has(route)) return true;
  return EXCLUDE_PREFIXES.some((p) => route.startsWith(p));
}

const orphaned = [];
const lowLinked = [];

for (const [route, sources] of inDegree.entries()) {
  if (isExcluded(route)) continue;
  if (sources.size === 0) orphaned.push(route);
  else if (sources.size === 1) lowLinked.push({ route, sources: [...sources] });
}

orphaned.sort();
lowLinked.sort((a, b) => a.route.localeCompare(b.route));

const overLinked = [];
for (const [file, targets] of outDegree.entries()) {
  if (targets.size >= OVER_LINK_THRESHOLD) {
    overLinked.push({ file, count: targets.size, targets: [...targets].sort() });
  }
}
overLinked.sort((a, b) => b.count - a.count);

// Top pages by in-degree
const byInDegree = [...inDegree.entries()]
  .filter(([r]) => !isExcluded(r))
  .map(([r, s]) => ({ route: r, count: s.size }))
  .sort((a, b) => b.count - a.count);

// ─── Output ─────────────────────────────────────────────────────────────────

if (JSON_OUTPUT) {
  process.stdout.write(
    JSON.stringify(
      {
        summary: {
          totalRoutes: allRoutes.size,
          orphaned: orphaned.length,
          lowLinked: lowLinked.length,
          overLinked: overLinked.length,
        },
        orphaned,
        lowLinked,
        overLinked,
        topByInDegree: byInDegree.slice(0, 20),
      },
      null,
      2
    )
  );
} else {
  const sep = "─".repeat(70);

  console.log(`\nKK-01 Internal Link Audit — ${new Date().toISOString().split("T")[0]}`);
  console.log(sep);
  console.log(`Total page routes scanned: ${allRoutes.size}`);
  console.log(`Orphaned (in-degree = 0):  ${orphaned.length}`);
  console.log(`Low-linked (in-degree = 1): ${lowLinked.length}`);
  console.log(`Over-linked (out-degree ≥ ${OVER_LINK_THRESHOLD}): ${overLinked.length}`);
  console.log();

  console.log("ORPHANED PAGES (no incoming internal links)");
  console.log(sep);
  if (orphaned.length === 0) {
    console.log("  (none)");
  } else {
    for (const r of orphaned) console.log(`  ${r}`);
  }
  console.log();

  console.log(`OVER-LINKED HUBS (≥${OVER_LINK_THRESHOLD} outgoing internal links)`);
  console.log(sep);
  if (overLinked.length === 0) {
    console.log("  (none)");
  } else {
    for (const { file, count } of overLinked) {
      console.log(`  ${file}  (${count} links)`);
    }
  }
  console.log();

  console.log("TOP 20 MOST-LINKED PAGES (in-degree)");
  console.log(sep);
  for (const { route, count } of byInDegree.slice(0, 20)) {
    console.log(`  ${String(count).padStart(4)}  ${route}`);
  }
  console.log();

  console.log("LOW-LINKED PAGES (exactly 1 incoming link — fragile)");
  console.log(sep);
  if (lowLinked.length === 0) {
    console.log("  (none)");
  } else {
    for (const { route, sources } of lowLinked.slice(0, 30)) {
      console.log(`  ${route}`);
      console.log(`         linked from: ${sources[0]}`);
    }
    if (lowLinked.length > 30) {
      console.log(`  ... and ${lowLinked.length - 30} more`);
    }
  }
  console.log();
}

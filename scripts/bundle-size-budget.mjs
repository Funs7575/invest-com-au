#!/usr/bin/env node
/**
 * PP-01 Bundle size budget gate
 *
 * Reads the Next.js production build output and checks that the total
 * shared client-side JavaScript does not exceed the configured budget.
 *
 * "Main bundle" = all JS files in .next/static/chunks/ that are NOT
 * page-specific lazy-loaded splits (identified by the build-manifest).
 * These are the files that load on every page (framework + main + common
 * vendor chunks), so they directly set the First Load JS floor.
 *
 * Exit codes:
 *   0 — within budget
 *   1 — budget exceeded (fail CI)
 *
 * Usage:
 *   node scripts/bundle-size-budget.mjs [--budget-kb 250] [--dir .next]
 */

import { promises as fs, existsSync } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BUDGET_KB_DEFAULT = 250;

function arg(name, defaultVal) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined
    ? process.argv[i + 1]
    : defaultVal;
}

const BUDGET_KB = Number(arg("budget-kb", BUDGET_KB_DEFAULT));
const NEXT_DIR = path.resolve(arg("dir", ".next"));
const CHUNKS_DIR = path.join(NEXT_DIR, "static", "chunks");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fileSizeKb(filepath) {
  try {
    const s = await fs.stat(filepath);
    return s.size / 1024;
  } catch {
    return 0;
  }
}

async function allJsFiles(dir) {
  const results = [];
  async function walk(d) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && e.name.endsWith(".js")) {
        results.push(full);
      }
    }
  }
  await walk(dir);
  return results;
}

/**
 * Read .next/build-manifest.json to get the list of pages and their
 * per-page chunk filenames. Anything in this manifest under a page key
 * is page-specific; the rest of static/chunks/ is shared.
 */
async function sharedChunks() {
  const manifestPath = path.join(NEXT_DIR, "build-manifest.json");
  if (!existsSync(manifestPath)) {
    // Fallback: treat all chunks as shared (conservative)
    return allJsFiles(CHUNKS_DIR);
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const pageSpecificFiles = new Set();

  // Collect page-specific chunk filenames
  for (const [page, files] of Object.entries(manifest.pages ?? {})) {
    // Skip common keys that aren't page-specific
    if (page === "__BUILD_MANIFEST" || page === "__SSG_MANIFEST") continue;
    for (const f of files) {
      // Paths in the manifest are relative to .next/static/
      const basename = path.basename(f);
      // Only exclude chunks that have a content-hash suffix typical of
      // page-specific splits (e.g., "app-abc123.js"). Shared named
      // chunks like "framework-*.js", "main-*.js" stay.
      if (basename.startsWith("app-") || basename.startsWith("page-")) {
        pageSpecificFiles.add(basename);
      }
    }
  }

  const allChunks = await allJsFiles(CHUNKS_DIR);
  return allChunks.filter((f) => !pageSpecificFiles.has(path.basename(f)));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(CHUNKS_DIR)) {
    console.error(`❌  ${CHUNKS_DIR} not found — run 'npm run build' first.`);
    process.exit(1);
  }

  const files = await sharedChunks();

  let totalKb = 0;
  const fileDetails = [];

  for (const f of files) {
    const kb = await fileSizeKb(f);
    totalKb += kb;
    fileDetails.push({ name: path.relative(NEXT_DIR, f), kb });
  }

  // Sort by size descending for readable output
  fileDetails.sort((a, b) => b.kb - a.kb);

  const totalMb = (totalKb / 1024).toFixed(2);
  const budgetMb = (BUDGET_KB / 1024).toFixed(2);
  const overBudget = totalKb > BUDGET_KB;
  const pctOfBudget = ((totalKb / BUDGET_KB) * 100).toFixed(1);

  console.log("");
  console.log("## Bundle Size Budget Report");
  console.log("");
  console.log(
    `Budget:  ${BUDGET_KB} kB (${budgetMb} MB)`,
  );
  console.log(
    `Actual:  ${totalKb.toFixed(1)} kB (${totalMb} MB) — ${pctOfBudget}% of budget`,
  );
  console.log("");

  if (fileDetails.length > 0) {
    console.log("Top shared chunks:");
    for (const { name, kb } of fileDetails.slice(0, 10)) {
      console.log(`  ${kb.toFixed(1).padStart(8)} kB  ${name}`);
    }
    if (fileDetails.length > 10) {
      console.log(`  ... and ${fileDetails.length - 10} more`);
    }
  }

  console.log("");

  if (overBudget) {
    const excess = (totalKb - BUDGET_KB).toFixed(1);
    console.error(
      `❌  BUDGET EXCEEDED: ${totalKb.toFixed(1)} kB > ${BUDGET_KB} kB budget (+${excess} kB over).`,
    );
    console.error(
      `   Reduce bundle size or raise the budget in scripts/bundle-size-budget.mjs`,
    );
    console.error(
      `   (raise only after deliberate decision — document why in the commit message).`,
    );
    process.exit(1);
  } else {
    const headroom = (BUDGET_KB - totalKb).toFixed(1);
    console.log(
      `✅  Within budget: ${totalKb.toFixed(1)} kB / ${BUDGET_KB} kB (${headroom} kB headroom).`,
    );
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Bundle budget script error:", err);
  process.exit(1);
});

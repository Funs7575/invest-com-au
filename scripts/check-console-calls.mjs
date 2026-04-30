#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * console.* sweep.
 *
 * Flags raw console.log / console.warn / console.error / console.info /
 * console.debug / console.trace calls in app/, lib/, components/, hooks/.
 * The codebase has its own structured logger at lib/logger.ts and a
 * convention to never use console.* directly (see CLAUDE.md "Single sources
 * of truth — Structured logging").
 *
 * F-05 swept the existing 9 occurrences. This script prevents new ones from
 * accumulating, and lets the scout fire surface any reintroduction.
 *
 * Usage:
 *   npm run audit:console-calls           # local
 *   node scripts/check-console-calls.mjs  # direct
 *
 * Exit codes:
 *   0  no violations
 *   1  one or more violations found
 *
 * Allowlist:
 *   Add  // console-allow: <reason>  on the same line, or the line above,
 *   for genuine exceptions (CLI scripts in scripts/ are excluded by default,
 *   so this should rarely be needed).
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOTS = ["app", "lib", "components", "hooks"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  ".vercel",
  "__tests__",
  "tests",
  "e2e",
]);
const SKIP_FILES = new Set([
  // The logger itself is allowed to use console.* as a fallback.
  "lib/logger.ts",
]);
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

const CONSOLE_RE = /\bconsole\.(log|warn|error|info|debug|trace)\s*\(/;

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
 * @param {string[]} lines
 * @param {number} idx  zero-based line index
 * @returns {boolean}
 */
function isAllowed(lines, idx) {
  if (lines[idx]?.includes("console-allow:")) return true;
  if (idx > 0 && lines[idx - 1]?.includes("console-allow:")) return true;
  return false;
}

async function main() {
  /** @type {Array<{file: string, line: number, snippet: string}>} */
  const findings = [];

  for (const root of ROOTS) {
    const abs = path.join(process.cwd(), root);
    const files = await walk(abs);
    for (const f of files) {
      const rel = path.relative(process.cwd(), f);
      if (SKIP_FILES.has(rel)) continue;
      const text = await fs.readFile(f, "utf8");
      if (!CONSOLE_RE.test(text)) continue;
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!CONSOLE_RE.test(line)) continue;
        if (isAllowed(lines, i)) continue;
        findings.push({
          file: rel,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }

  if (findings.length === 0) {
    console.log("console.* sweep passed — 0 raw console calls in app/lib/components/hooks.");
    process.exit(0);
  }

  console.error(
    `\n::error::console.* sweep found ${findings.length} raw call(s). Use lib/logger.ts instead.\n`
  );
  for (const f of findings) {
    console.error(`  ✗  ${f.file}:${f.line}  ${f.snippet}`);
  }
  console.error(
    "\nFix: import { logger } from '@/lib/logger'; then logger.info / logger.warn / logger.error."
  );
  console.error(
    "Or, for a genuine exception, add  // console-allow: <reason>  on the line."
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-console-calls: unexpected error:", err);
    process.exit(1);
  });
}

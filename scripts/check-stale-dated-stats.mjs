#!/usr/bin/env node
// @ts-check
/**
 * Stale-dated-stats gate (V-NEW-01).
 *
 * Scans every .tsx file in the repository for <DatedStatBadge stalesAt="…">
 * props whose date is in the past and fails the build when any are found.
 *
 * A stale DatedStatBadge means a dated claim on a hub page has passed its
 * own declared expiry — users would see incorrect (outdated) stats shipped
 * to production with no test catching it.
 *
 * How to fix a failing gate:
 *   1. Update the stalesAt prop to a future date.
 *   2. Update the stat's displayed value to match the latest source data.
 *   3. If the date is intentionally historical (legal copy, milestone),
 *      add {/* dated-stale-ok *\/} immediately before the <DatedStatBadge>.
 *
 * Escape hatches
 * ──────────────
 *   File-level:  add `// dated-stale-exempt` in the first 5 lines.
 *                Use for files that render stalesAt from a database at
 *                runtime (can't be known at compile time). Document why.
 *
 *   Usage-level: add {/* dated-stale-ok *\/} on the line immediately
 *                before the <DatedStatBadge stalesAt="…"> usage.
 *                Use for genuinely historical dates (launch milestones,
 *                legal effective dates, archival copy).
 *
 * stalesAt value formats recognised
 * ───────────────────────────────────
 *   stalesAt="2026-06-30"             — bare ISO string attribute
 *   stalesAt={"2026-06-30"}           — JS expression string
 *   stalesAt={new Date("2026-06-30")} — Date constructor with ISO literal
 *   Other forms (variables, expressions) are skipped — can't parse statically.
 *
 * Usage:
 *   npm run audit:stale-dated-stats           # local
 *   node scripts/check-stale-dated-stats.mjs  # direct
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

/** Directories / file patterns that are never scanned. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "out",
  ".turbo",
]);

const SKIP_PATH_RE =
  /(?:^|\/)(?:__tests__|scripts|docs|supabase|\.github)\//;

const SKIP_FILE_RE = /\.(?:test|spec)\.(ts|tsx)$/;

// ─── Exported helpers (imported by tests via dynamic import) ─────────────────

/**
 * Returns true if the file declares a file-level exemption in its first 5 lines.
 * @param {string} content
 */
export function isFileExempt(content) {
  const header = content.split("\n").slice(0, 5).join("\n");
  return /\/\/\s*dated-stale-exempt/.test(header);
}

/**
 * Parses a stalesAt value from a DatedStatBadge JSX opening tag (or any
 * substring containing a stalesAt= attribute).
 *
 * Handles:
 *   stalesAt="2026-06-30"
 *   stalesAt='2026-06-30'
 *   stalesAt={"2026-06-30"}
 *   stalesAt={'2026-06-30'}
 *   stalesAt={new Date("2026-06-30")}
 *   stalesAt={new Date('2026-06-30')}
 *
 * Returns the ISO date string, or null when the form can't be parsed statically.
 * @param {string} chunk
 * @returns {string | null}
 */
export function parseStalesAt(chunk) {
  const patterns = [
    /stalesAt=\{new Date\(["']([^"']+)["']\)\}/,
    /stalesAt=\{["']([^"']+)["']\}/,
    /stalesAt="([^"]+)"/,
    /stalesAt='([^']+)'/,
  ];
  for (const re of patterns) {
    const m = chunk.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Returns true when dateStr (ISO string like "2026-06-30") represents a date
 * strictly before `today` (midnight comparison — "today" is NOT stale).
 * Returns false for unparseable strings.
 * @param {string} dateStr
 * @param {Date} [today]
 */
export function isDateStale(dateStr, today = new Date()) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  // Compare on UTC calendar boundaries — `setHours(0,…)` uses local time and
  // moves the day boundary by the runner's tz offset, flipping the result of
  // "2026-04-26T23:59Z stale relative to 2026-04-27T00:00Z" on any positive-
  // offset host. Switch both anchors to UTC midnight.
  const midnight = new Date(today);
  midnight.setUTCHours(0, 0, 0, 0);
  d.setUTCHours(0, 0, 0, 0);
  return d < midnight;
}

/**
 * Scans `content` for DatedStatBadge opening tags and returns a list of
 * violations: tags whose parsed stalesAt is before `today` with no escape.
 *
 * @param {string} content   Full .tsx file content.
 * @param {Date}   [today]   Override "today" (used in tests).
 * @returns {Array<{line: number, stalesAt: string}>}
 */
export function extractViolations(content, today = new Date()) {
  if (isFileExempt(content)) return [];

  const violations = [];
  const lines = content.split("\n");

  // Walk the content character-by-character to find <DatedStatBadge …> blocks
  // (which may span multiple lines). We collect the full opening tag so we can
  // parse the stalesAt prop correctly even in multi-line JSX.
  let i = 0;
  while (i < content.length) {
    const tagStart = content.indexOf("<DatedStatBadge", i);
    if (tagStart === -1) break;

    // Walk forward to the closing > of this opening tag, respecting strings so
    // we don't mistake a > inside a prop value for the end of the tag.
    let j = tagStart + "<DatedStatBadge".length;
    let inStr = /** @type {string|null} */ (null);
    while (j < content.length) {
      const ch = content[j];
      if (inStr) {
        if (ch === inStr) inStr = null;
      } else {
        if (ch === '"' || ch === "'") {
          inStr = ch;
        } else if (ch === ">") {
          j++;
          break;
        }
      }
      j++;
    }

    const openingTag = content.slice(tagStart, j);
    const dateStr = parseStalesAt(openingTag);

    if (dateStr !== null && isDateStale(dateStr, today)) {
      // Compute 1-based line number of the tag start
      const lineNum = content.slice(0, tagStart).split("\n").length;

      // Check usage-level escape hatch on the immediately preceding line
      const prevLine = lineNum >= 2 ? (lines[lineNum - 2] ?? "") : "";
      const usageExempt = /\{\/\*\s*dated-stale-ok\s*\*\/\}/.test(prevLine);

      if (!usageExempt) {
        violations.push({ line: lineNum, stalesAt: dateStr });
      }
    }

    i = j;
  }

  return violations;
}

// ─── File-system helpers ─────────────────────────────────────────────────────

/**
 * Recursively collects .tsx files under `dir`, skipping exempt directories.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function findTsxFiles(dir) {
  /** @type {string[]} */
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(REPO_ROOT, fullPath);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (SKIP_PATH_RE.test(relPath + "/")) continue;
      results.push(...(await findTsxFiles(fullPath)));
    } else if (
      entry.name.endsWith(".tsx") &&
      !SKIP_FILE_RE.test(entry.name) &&
      !SKIP_PATH_RE.test(relPath)
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const files = await findTsxFiles(REPO_ROOT);
  const allViolations = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf-8");
    const violations = extractViolations(content, today);
    for (const v of violations) {
      allViolations.push({
        file: path.relative(REPO_ROOT, file),
        ...v,
      });
    }
  }

  if (allViolations.length === 0) {
    console.log(
      `✓ No stale <DatedStatBadge stalesAt> props found (${files.length} files scanned, today = ${todayStr}).`
    );
    process.exit(0);
  }

  console.error(
    `\n✗ ${allViolations.length} stale <DatedStatBadge> prop(s) found — update the stat or add an escape hatch:\n`
  );
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}  stalesAt="${v.stalesAt}" (was valid until ${v.stalesAt})`);
  }
  console.error(`
How to fix:
  1. Update the stalesAt prop to a future date.
  2. Update the displayed stat value to the latest data.
  3. If the date is genuinely historical (legal copy, launch milestone),
     add {/* dated-stale-ok */} on the line immediately before the badge:

       {/* dated-stale-ok */}
       <DatedStatBadge stalesAt="2026-01-15">$2.1B committed</DatedStatBadge>
`);
  process.exit(1);
}

main().catch((err) => {
  console.error("check-stale-dated-stats: unexpected error:", err);
  process.exit(1);
});

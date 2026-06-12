#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Dated strings gate (Y-08).
 *
 * Detects bare date strings (e.g. "27 April 2026") in JSX/TSX files that
 * are NOT wrapped in <DatedStatBadge>.  Bare dates in page content are a
 * silent correctness risk: they don't fail tests when they become stale,
 * so users see expired dates and the build stays green.
 *
 * A date is considered "wrapped" when a DatedStatBadge reference appears
 * within WINDOW_LINES lines of the matching line — covering same-line usage
 * (<DatedStatBadge>30 April 2026</DatedStatBadge>) and multiline usage where
 * the opening tag precedes the date on the next few lines.
 *
 * Exemptions (file-level):
 *   - Test files: *.test.ts / *.test.tsx / __tests__/** / *.spec.*
 *   - Scripts, docs, migrations: scripts/ | docs/ | supabase/
 *   - Files that declare `// dated-strings-exempt` in the first 5 lines
 *     (use when a file renders dates from a DB and can't know stalesAt at
 *     compile time — document the reason inline)
 *
 * Escape hatch (line-level):
 *   // dated-ok    — on the matching line or the immediately preceding line
 *   (use for genuinely static dates: release notes, legal effective-dates,
 *   historical milestone copy that will never need updating)
 *
 * Usage:
 *   npm run audit:dated-strings           # local
 *   node scripts/check-dated-strings.mjs  # direct
 *
 * CI sets GITHUB_BASE_REF so the script only examines .tsx files that were
 * added or modified in the current PR.  Locally it falls back to comparing
 * against `main` so you can preview failures before pushing.
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Matches spelled-out calendar dates: "27 April 2026", "1 January 2025", etc.
 * Case-insensitive so "april" / "APRIL" / "April" all match.
 * The `g` flag is required for exec-in-loop; callers MUST reset lastIndex.
 */
const DATE_PATTERN =
  /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi;

/** Lines before/after a match to search for a DatedStatBadge reference. */
const WINDOW_LINES = 5;

// ---------------------------------------------------------------------------
// Helpers — exported so unit tests can call them directly
// ---------------------------------------------------------------------------

/**
 * Returns true if `filePath` should be excluded from the gate.
 * Test files and non-JSX assets legitimately contain dates as fixture data.
 *
 * @param {string} filePath  relative path from repo root (forward slashes)
 */
export function isExemptFile(filePath) {
  const f = filePath.replace(/\\/g, "/");
  return (
    f.includes("__tests__/") ||
    f.endsWith(".test.ts") ||
    f.endsWith(".test.tsx") ||
    f.endsWith(".spec.ts") ||
    f.endsWith(".spec.tsx") ||
    f.startsWith("scripts/") ||
    f.startsWith("docs/") ||
    f.startsWith("supabase/") ||
    f.endsWith(".md")
  );
}

/**
 * Returns true when the first 5 lines of `content` contain
 * `// dated-strings-exempt`.  Use for pages that render dates from the DB
 * where `stalesAt` can't be known at compile time.
 *
 * @param {string} content  full file content
 */
export function isFileExemptByContent(content) {
  return content
    .split("\n")
    .slice(0, 5)
    .some((line) => line.includes("// dated-strings-exempt"));
}

/**
 * Finds every date-shaped string in `content` and returns the line index,
 * line text, and matched substring for each hit.
 *
 * @param {string} content
 * @returns {Array<{lineIndex: number, lineText: string, match: string}>}
 */
export function extractDateMatches(content) {
  const lines = content.split("\n");
  /** @type {Array<{lineIndex: number, lineText: string, match: string}>} */
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    DATE_PATTERN.lastIndex = 0; // reset global regex state each line
    let m;
    while ((m = DATE_PATTERN.exec(lines[i])) !== null) {
      results.push({ lineIndex: i, lineText: lines[i], match: m[0] });
    }
  }
  return results;
}

/**
 * Returns true if `lineIndex` falls within WINDOW_LINES of a line that
 * references `DatedStatBadge` — i.e. the date is the badge's content or
 * appears in the same JSX subtree as the badge opening/closing tag.
 *
 * @param {string[]} lines
 * @param {number}   lineIndex
 */
export function isInDatedBadgeContext(lines, lineIndex) {
  const start = Math.max(0, lineIndex - WINDOW_LINES);
  const end = Math.min(lines.length - 1, lineIndex + WINDOW_LINES);
  for (let i = start; i <= end; i++) {
    if (lines[i].includes("DatedStatBadge")) return true;
  }
  return false;
}

/**
 * Returns true if the matching line or the immediately preceding line
 * carries a `// dated-ok` (or JSX-comment `{/* dated-ok *​/}`) escape hatch.
 * Both forms are accepted because raw `// dated-ok` inside JSX children is
 * itself an eslint error (react/jsx-no-comment-textnodes) — JSX call sites
 * must use the brace-comment form.
 *
 * @param {string[]} lines
 * @param {number}   lineIndex
 */
export function hasEscapeHatch(lines, lineIndex) {
  const prev = lineIndex > 0 ? lines[lineIndex - 1] : "";
  const marked = (line) => line.includes("// dated-ok") || line.includes("/* dated-ok");
  return marked(lines[lineIndex]) || marked(prev);
}

/**
 * Returns changed + added .tsx files in the current PR relative to `baseRef`.
 * Falls back gracefully when the git command fails (e.g. shallow clone).
 *
 * @param {string} baseRef  e.g. "main"
 * @returns {string[]}
 */
export function getChangedTsxFiles(baseRef = "main") {
  try {
    const raw = execSync(
      `git diff --name-only --diff-filter=ACM "origin/${baseRef}...HEAD"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return raw
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.endsWith(".tsx") && f.length > 0 && !isExemptFile(f));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main() {
  const baseRef = process.env.GITHUB_BASE_REF ?? "main";
  const changedFiles = getChangedTsxFiles(baseRef);

  if (changedFiles.length === 0) {
    console.log("No changed .tsx files in this PR — dated strings gate passed.");
    process.exit(0);
  }

  console.log(
    `Scanning ${changedFiles.length} changed .tsx file(s) for bare date strings…\n`
  );

  /** @type {Array<{file: string, line: number, match: string, lineText: string}>} */
  const failures = [];

  for (const relPath of changedFiles) {
    const absPath = path.join(process.cwd(), relPath);
    let content;
    try {
      content = await fs.readFile(absPath, "utf8");
    } catch {
      console.warn(`  ⚠  Cannot read ${relPath} — skipping`);
      continue;
    }

    if (isFileExemptByContent(content)) {
      console.log(`  –  ${relPath}  (file-level dated-strings-exempt)`);
      continue;
    }

    const lines = content.split("\n");
    const matches = extractDateMatches(content);
    let fileClean = true;

    for (const { lineIndex, lineText, match } of matches) {
      if (isInDatedBadgeContext(lines, lineIndex)) continue;
      if (hasEscapeHatch(lines, lineIndex)) continue;
      failures.push({ file: relPath, line: lineIndex + 1, match, lineText: lineText.trim() });
      fileClean = false;
    }

    if (matches.length > 0 && fileClean) {
      console.log(`  ✓  ${relPath}  (all dates wrapped)`);
    }
  }

  if (failures.length === 0) {
    console.log(
      "\nDated strings gate passed — all date strings are wrapped in <DatedStatBadge>."
    );
    process.exit(0);
  }

  console.error(
    "\n::error::Dated strings gate failed — bare date strings found outside <DatedStatBadge>:\n"
  );
  for (const { file, line, match, lineText } of failures) {
    console.error(`  ✗  ${file}:${line}  "${match}"`);
    console.error(`     ${lineText}`);
    console.error(
      `     → Wrap in <DatedStatBadge stalesAt="YYYY-MM-DD">${match}</DatedStatBadge>`
    );
    console.error(
      `       or add  // dated-ok  to the line if the date will never need updating.\n`
    );
  }
  console.error("Docs: components/DatedStatBadge.tsx  lib/dated-stats.ts");
  process.exit(1);
}

// Only run main() when invoked directly, not when imported by tests
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-dated-strings: unexpected error:", err);
    process.exit(1);
  });
}

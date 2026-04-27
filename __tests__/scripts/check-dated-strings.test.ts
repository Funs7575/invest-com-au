/**
 * Tests for scripts/check-dated-strings.mjs (Y-08).
 *
 * Exercises the exported helper functions directly so CI gate behaviour can
 * be asserted without spawning a child process.  main() is a thin wrapper
 * around these helpers and is covered by the CI job on every PR.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const gatePath = join(process.cwd(), "scripts/check-dated-strings.mjs");

let extractDateMatches: (content: string) => Array<{ lineIndex: number; lineText: string; match: string }>;
let isInDatedBadgeContext: (lines: string[], lineIndex: number) => boolean;
let hasEscapeHatch: (lines: string[], lineIndex: number) => boolean;
let isExemptFile: (filePath: string) => boolean;
let isFileExemptByContent: (content: string) => boolean;

beforeAll(async () => {
  const mod = await import(gatePath);
  extractDateMatches = mod.extractDateMatches;
  isInDatedBadgeContext = mod.isInDatedBadgeContext;
  hasEscapeHatch = mod.hasEscapeHatch;
  isExemptFile = mod.isExemptFile;
  isFileExemptByContent = mod.isFileExemptByContent;
});

// ---------------------------------------------------------------------------
// extractDateMatches
// ---------------------------------------------------------------------------

describe("extractDateMatches", () => {
  it("finds a spelled-out date on a single line", () => {
    const content = `<p>Deadline: 30 April 2026</p>`;
    const matches = extractDateMatches(content);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.match).toBe("30 April 2026");
    expect(matches[0]?.lineIndex).toBe(0);
  });

  it("finds multiple dates on different lines", () => {
    const content = [
      `<p>Opens 1 January 2026</p>`,
      `<p>Closes 31 December 2026</p>`,
    ].join("\n");
    const matches = extractDateMatches(content);
    expect(matches).toHaveLength(2);
    expect(matches[0]?.match).toBe("1 January 2026");
    expect(matches[1]?.match).toBe("31 December 2026");
  });

  it("finds two dates on the same line", () => {
    const content = `Between 1 July 2026 and 30 June 2027`;
    const matches = extractDateMatches(content);
    expect(matches).toHaveLength(2);
    expect(matches[0]?.match).toBe("1 July 2026");
    expect(matches[1]?.match).toBe("30 June 2027");
  });

  it("is case-insensitive (month name)", () => {
    const content = `Valid from 15 april 2026`;
    const matches = extractDateMatches(content);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.match.toLowerCase()).toContain("april");
  });

  it("does NOT match ISO date strings like 2026-04-30", () => {
    const matches = extractDateMatches(`Expires: 2026-04-30`);
    expect(matches).toHaveLength(0);
  });

  it("does NOT match partial patterns like 'April 2026' (no day)", () => {
    const matches = extractDateMatches(`Last updated: April 2026`);
    expect(matches).toHaveLength(0);
  });

  it("does NOT match numeric-only dates like 30/04/2026", () => {
    const matches = extractDateMatches(`Date: 30/04/2026`);
    expect(matches).toHaveLength(0);
  });

  it("returns empty array for content with no date strings", () => {
    const content = `<p>This page has no dates at all.</p>`;
    expect(extractDateMatches(content)).toHaveLength(0);
  });

  it("reports correct line numbers for multiline content", () => {
    const content = [`line 0`, `line 1`, `Date: 15 March 2026`].join("\n");
    const matches = extractDateMatches(content);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.lineIndex).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// isInDatedBadgeContext
// ---------------------------------------------------------------------------

describe("isInDatedBadgeContext", () => {
  it("returns true when DatedStatBadge is on the same line", () => {
    const lines = [`<DatedStatBadge stalesAt="2026-12-31">30 April 2026</DatedStatBadge>`];
    expect(isInDatedBadgeContext(lines, 0)).toBe(true);
  });

  it("returns true when DatedStatBadge opens on the preceding line", () => {
    const lines = [
      `<DatedStatBadge stalesAt="2026-12-31">`,
      `  30 April 2026`,
      `</DatedStatBadge>`,
    ];
    expect(isInDatedBadgeContext(lines, 1)).toBe(true);
  });

  it("returns true when DatedStatBadge is within WINDOW_LINES (5) above", () => {
    const lines = [
      `<DatedStatBadge stalesAt="2026-12-31">`,
      `line 1`,
      `line 2`,
      `line 3`,
      `line 4`,
      `  30 April 2026`,
    ];
    // lineIndex 5, DatedStatBadge at lineIndex 0 — distance 5 (within window)
    expect(isInDatedBadgeContext(lines, 5)).toBe(true);
  });

  it("returns false when DatedStatBadge is more than WINDOW_LINES away", () => {
    const lines = [
      `<DatedStatBadge stalesAt="2026-12-31">some other date</DatedStatBadge>`,
      `line 1`,
      `line 2`,
      `line 3`,
      `line 4`,
      `line 5`,
      `  30 April 2026`,  // distance 6 from the badge — outside window
    ];
    expect(isInDatedBadgeContext(lines, 6)).toBe(false);
  });

  it("returns false when there is no DatedStatBadge anywhere near the line", () => {
    const lines = [`<p>Deadline: 30 April 2026</p>`];
    expect(isInDatedBadgeContext(lines, 0)).toBe(false);
  });

  it("handles lineIndex at the start of a file (no underflow)", () => {
    const lines = [`30 April 2026`];
    expect(isInDatedBadgeContext(lines, 0)).toBe(false);
  });

  it("handles lineIndex at the end of a file (no overflow)", () => {
    const lines = [`line 0`, `line 1`, `30 April 2026`];
    expect(isInDatedBadgeContext(lines, 2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasEscapeHatch
// ---------------------------------------------------------------------------

describe("hasEscapeHatch", () => {
  it("returns true when the matching line contains // dated-ok", () => {
    const lines = [`<p>30 April 2026</p> // dated-ok`];
    expect(hasEscapeHatch(lines, 0)).toBe(true);
  });

  it("returns true when the preceding line contains // dated-ok", () => {
    const lines = [
      `{/* dated-ok */} // dated-ok`,
      `<p>30 April 2026</p>`,
    ];
    expect(hasEscapeHatch(lines, 1)).toBe(true);
  });

  it("returns false when neither the line nor the preceding line has the comment", () => {
    const lines = [`<p>Intro</p>`, `<p>30 April 2026</p>`];
    expect(hasEscapeHatch(lines, 1)).toBe(false);
  });

  it("handles lineIndex 0 with no preceding line (no underflow)", () => {
    const lines = [`<p>30 April 2026</p>`];
    expect(hasEscapeHatch(lines, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isExemptFile
// ---------------------------------------------------------------------------

describe("isExemptFile", () => {
  it("exempts test files under __tests__/", () => {
    expect(isExemptFile("__tests__/lib/some.test.tsx")).toBe(true);
  });

  it("exempts *.test.tsx files outside __tests__/", () => {
    expect(isExemptFile("components/Foo.test.tsx")).toBe(true);
  });

  it("exempts *.spec.tsx files", () => {
    expect(isExemptFile("lib/utils.spec.tsx")).toBe(true);
  });

  it("exempts files under scripts/", () => {
    expect(isExemptFile("scripts/seed-content.ts")).toBe(true);
  });

  it("exempts files under docs/", () => {
    expect(isExemptFile("docs/runbooks/launch-day.md")).toBe(true);
  });

  it("exempts Supabase migration files", () => {
    expect(isExemptFile("supabase/migrations/20260427_foo.sql")).toBe(true);
  });

  it("does NOT exempt regular .tsx page files", () => {
    expect(isExemptFile("app/grants/page.tsx")).toBe(false);
  });

  it("does NOT exempt component .tsx files", () => {
    expect(isExemptFile("components/HubHero.tsx")).toBe(false);
  });

  it("handles Windows-style backslash paths", () => {
    expect(isExemptFile("__tests__\\lib\\foo.test.tsx")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isFileExemptByContent
// ---------------------------------------------------------------------------

describe("isFileExemptByContent", () => {
  it("returns true when first line contains the exempt marker", () => {
    const content = `// dated-strings-exempt\nimport React from 'react';`;
    expect(isFileExemptByContent(content)).toBe(true);
  });

  it("returns true when the marker is within the first 5 lines", () => {
    const content = `line1\nline2\nline3\n// dated-strings-exempt\nline5`;
    expect(isFileExemptByContent(content)).toBe(true);
  });

  it("returns false when the marker appears after line 5", () => {
    const content = `l1\nl2\nl3\nl4\nl5\n// dated-strings-exempt`;
    expect(isFileExemptByContent(content)).toBe(false);
  });

  it("returns false when the marker is absent", () => {
    const content = `export default function Page() { return <div /> }`;
    expect(isFileExemptByContent(content)).toBe(false);
  });
});

/**
 * Tests for scripts/check-stale-dated-stats.mjs (V-NEW-01).
 *
 * Exercises exported helpers directly — no child-process spawning needed.
 * The main() runner is a thin wrapper covered by the CI job on every PR.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const gatePath = join(process.cwd(), "scripts/check-stale-dated-stats.mjs");

let isFileExempt: (content: string) => boolean;
let parseStalesAt: (chunk: string) => string | null;
let isDateStale: (dateStr: string, today?: Date) => boolean;
let extractViolations: (
  content: string,
  today?: Date
) => Array<{ line: number; stalesAt: string }>;

beforeAll(async () => {
  const mod = await import(gatePath);
  isFileExempt = mod.isFileExempt;
  parseStalesAt = mod.parseStalesAt;
  isDateStale = mod.isDateStale;
  extractViolations = mod.extractViolations;
});

// Fixed reference date for all staleness tests
const TODAY = new Date("2026-04-27T00:00:00Z");
const YESTERDAY = "2026-04-26";
const TODAY_STR = "2026-04-27";
const TOMORROW = "2026-04-28";
const FUTURE = "2027-01-01";

// ---------------------------------------------------------------------------
// isFileExempt
// ---------------------------------------------------------------------------

describe("isFileExempt", () => {
  it("returns false for a normal file", () => {
    expect(isFileExempt("<p>Hello</p>")).toBe(false);
  });

  it("returns true when // dated-stale-exempt appears in line 1", () => {
    const content = "// dated-stale-exempt\nexport default function Page() {}";
    expect(isFileExempt(content)).toBe(true);
  });

  it("returns true when marker is in line 3 (within first 5)", () => {
    const content = "line1\nline2\n// dated-stale-exempt\nline4";
    expect(isFileExempt(content)).toBe(true);
  });

  it("returns false when marker is on line 6 (beyond first 5)", () => {
    const lines = ["l1", "l2", "l3", "l4", "l5", "// dated-stale-exempt"];
    expect(isFileExempt(lines.join("\n"))).toBe(false);
  });

  it("accepts extra whitespace around the marker", () => {
    expect(isFileExempt("//   dated-stale-exempt")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseStalesAt
// ---------------------------------------------------------------------------

describe("parseStalesAt", () => {
  it('parses stalesAt="ISO"', () => {
    expect(parseStalesAt(`<DatedStatBadge stalesAt="2026-06-30">`)).toBe(
      "2026-06-30"
    );
  });

  it("parses stalesAt='ISO' (single-quoted)", () => {
    expect(parseStalesAt(`<DatedStatBadge stalesAt='2026-06-30'>`)).toBe(
      "2026-06-30"
    );
  });

  it('parses stalesAt={"ISO"}', () => {
    expect(parseStalesAt(`<DatedStatBadge stalesAt={"2026-06-30"}>`)).toBe(
      "2026-06-30"
    );
  });

  it("parses stalesAt={new Date('ISO')}", () => {
    expect(
      parseStalesAt(`<DatedStatBadge stalesAt={new Date('2026-06-30')}>`)
    ).toBe("2026-06-30");
  });

  it('parses stalesAt={new Date("ISO")}', () => {
    expect(
      parseStalesAt(`<DatedStatBadge stalesAt={new Date("2026-06-30")}>`)
    ).toBe("2026-06-30");
  });

  it("returns null for a variable expression", () => {
    expect(parseStalesAt(`<DatedStatBadge stalesAt={expiryDate}>`)).toBeNull();
  });

  it("returns null when stalesAt is absent", () => {
    expect(parseStalesAt(`<DatedStatBadge value="$2B">`)).toBeNull();
  });

  it("handles dates with time components", () => {
    expect(
      parseStalesAt(`<DatedStatBadge stalesAt="2026-06-30T00:00:00Z">`)
    ).toBe("2026-06-30T00:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// isDateStale
// ---------------------------------------------------------------------------

describe("isDateStale", () => {
  it("returns true for a date strictly before today", () => {
    expect(isDateStale(YESTERDAY, TODAY)).toBe(true);
  });

  it("returns false for today's date (not stale yet)", () => {
    expect(isDateStale(TODAY_STR, TODAY)).toBe(false);
  });

  it("returns false for a future date", () => {
    expect(isDateStale(FUTURE, TODAY)).toBe(false);
  });

  it("returns false for tomorrow", () => {
    expect(isDateStale(TOMORROW, TODAY)).toBe(false);
  });

  it("returns false for an unparseable string", () => {
    expect(isDateStale("not-a-date", TODAY)).toBe(false);
  });

  it("returns true for a date with time component still in the past", () => {
    // 2026-04-26T23:59:00Z is still yesterday
    expect(isDateStale("2026-04-26T23:59:00Z", TODAY)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// extractViolations
// ---------------------------------------------------------------------------

describe("extractViolations", () => {
  it("returns empty for a file with no DatedStatBadge", () => {
    const content = `<p>No badges here</p>`;
    expect(extractViolations(content, TODAY)).toHaveLength(0);
  });

  it("returns empty for a future stalesAt", () => {
    const content = `<DatedStatBadge stalesAt="${FUTURE}">$2B</DatedStatBadge>`;
    expect(extractViolations(content, TODAY)).toHaveLength(0);
  });

  it("returns empty for today's stalesAt (not stale)", () => {
    const content = `<DatedStatBadge stalesAt="${TODAY_STR}">$2B</DatedStatBadge>`;
    expect(extractViolations(content, TODAY)).toHaveLength(0);
  });

  it("reports a violation for a past stalesAt", () => {
    const content = `<DatedStatBadge stalesAt="${YESTERDAY}">$2B</DatedStatBadge>`;
    const v = extractViolations(content, TODAY);
    expect(v).toHaveLength(1);
    expect(v[0]?.stalesAt).toBe(YESTERDAY);
    expect(v[0]?.line).toBe(1);
  });

  it("reports the correct 1-based line number for a badge on line 3", () => {
    const content = [
      `export default function Page() {`,
      `  return (`,
      `    <DatedStatBadge stalesAt="${YESTERDAY}">old stat</DatedStatBadge>`,
      `  );`,
      `}`,
    ].join("\n");
    const v = extractViolations(content, TODAY);
    expect(v).toHaveLength(1);
    expect(v[0]?.line).toBe(3);
  });

  it("reports multiple violations when several badges are stale", () => {
    const content = [
      `<DatedStatBadge stalesAt="${YESTERDAY}">A</DatedStatBadge>`,
      `<DatedStatBadge stalesAt="${FUTURE}">B — fine</DatedStatBadge>`,
      `<DatedStatBadge stalesAt="2026-01-01">C</DatedStatBadge>`,
    ].join("\n");
    const v = extractViolations(content, TODAY);
    expect(v).toHaveLength(2);
    expect(v[0]?.stalesAt).toBe(YESTERDAY);
    expect(v[1]?.stalesAt).toBe("2026-01-01");
  });

  it("does NOT report a violation when file-level exemption is set", () => {
    const content = [
      `// dated-stale-exempt`,
      `<DatedStatBadge stalesAt="${YESTERDAY}">old stat</DatedStatBadge>`,
    ].join("\n");
    expect(extractViolations(content, TODAY)).toHaveLength(0);
  });

  it("respects {/* dated-stale-ok */} escape on the preceding line", () => {
    const content = [
      `{/* dated-stale-ok */}`,
      `<DatedStatBadge stalesAt="${YESTERDAY}">historical milestone</DatedStatBadge>`,
    ].join("\n");
    expect(extractViolations(content, TODAY)).toHaveLength(0);
  });

  it("does NOT respect dated-stale-ok two lines before (only immediately preceding)", () => {
    const content = [
      `{/* dated-stale-ok */}`,
      `<p>some other JSX</p>`,
      `<DatedStatBadge stalesAt="${YESTERDAY}">stale</DatedStatBadge>`,
    ].join("\n");
    const v = extractViolations(content, TODAY);
    expect(v).toHaveLength(1);
  });

  it("handles a multiline DatedStatBadge opening tag", () => {
    const content = [
      `<DatedStatBadge`,
      `  value="$2B"`,
      `  stalesAt="${YESTERDAY}"`,
      `>`,
      `  $2B committed`,
      `</DatedStatBadge>`,
    ].join("\n");
    const v = extractViolations(content, TODAY);
    expect(v).toHaveLength(1);
    expect(v[0]?.stalesAt).toBe(YESTERDAY);
    expect(v[0]?.line).toBe(1); // tag opened on line 1
  });

  it("handles {new Date('…')} stalesAt form", () => {
    const content = `<DatedStatBadge stalesAt={new Date('${YESTERDAY}')}>stat</DatedStatBadge>`;
    const v = extractViolations(content, TODAY);
    expect(v).toHaveLength(1);
    expect(v[0]?.stalesAt).toBe(YESTERDAY);
  });

  it("skips a badge whose stalesAt is a variable (dynamic)", () => {
    const content = `<DatedStatBadge stalesAt={expiryDate}>stat</DatedStatBadge>`;
    expect(extractViolations(content, TODAY)).toHaveLength(0);
  });

  it("handles a file with mixed badges — only stale ones reported", () => {
    const content = [
      `<DatedStatBadge stalesAt="${FUTURE}">fine</DatedStatBadge>`,
      `<DatedStatBadge stalesAt="${TODAY_STR}">today — fine</DatedStatBadge>`,
      `<DatedStatBadge stalesAt="${YESTERDAY}">stale</DatedStatBadge>`,
    ].join("\n");
    const v = extractViolations(content, TODAY);
    expect(v).toHaveLength(1);
    expect(v[0]?.stalesAt).toBe(YESTERDAY);
  });

  it("correctly counts lines around the violation", () => {
    const lines = [
      "import React from 'react';",
      "",
      "export function Hero() {",
      "  return (",
      `    <DatedStatBadge stalesAt="${YESTERDAY}">`,
      "      Old value",
      "    </DatedStatBadge>",
      "  );",
      "}",
    ];
    const v = extractViolations(lines.join("\n"), TODAY);
    expect(v).toHaveLength(1);
    expect(v[0]?.line).toBe(5);
  });

  it("parses stalesAt from a Y-05-ENRICH multi-prop badge (sourcedAt + source + url)", () => {
    const content = [
      `<DatedStatBadge`,
      `  value="$2.1B"`,
      `  sourcedAt="2026-01-15"`,
      `  stalesAt="${YESTERDAY}"`,
      `  source="ASIC, 2026-01-15"`,
      `  sourceUrl="https://asic.gov.au/regulatory-resources/find-a-document/reports/rep-789-managed-funds-2026"`,
      `>`,
      `  $2.1B committed`,
      `</DatedStatBadge>`,
    ].join("\n");
    const v = extractViolations(content, TODAY);
    expect(v).toHaveLength(1);
    expect(v[0]?.stalesAt).toBe(YESTERDAY);
  });

  it("does not flag a Y-05-ENRICH badge whose only date prop is sourcedAt (no stalesAt)", () => {
    // When stalesAt is omitted the component derives it at runtime; the static
    // CI gate has no static stalesAt to evaluate so the file is silently passed.
    const content = `<DatedStatBadge value="$1B" sourcedAt="${YESTERDAY}">old</DatedStatBadge>`;
    expect(extractViolations(content, TODAY)).toHaveLength(0);
  });
});

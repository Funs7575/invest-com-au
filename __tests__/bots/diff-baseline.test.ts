/**
 * Unit tests for bots-diff-baseline.ts — the cross-run regression diffing logic.
 *
 * Tests the pure `computeDiff` function in isolation without any file I/O.
 * The finding ID is a stable hash of (category + normalizedUrl + title),
 * so tests construct deterministic IDs directly.
 */

import { describe, it, expect } from "vitest";
import { computeDiff, sortBySeverity } from "../../scripts/bots-diff-baseline";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFindings(
  defs: Array<{
    id: string;
    severity?: string;
    category?: string;
    title?: string;
    url?: string;
    occurrences?: number;
  }>,
) {
  return defs.map((d) => ({
    id: d.id,
    severity: d.severity ?? "medium",
    category: d.category ?? "http-error",
    title: d.title ?? `Finding ${d.id}`,
    url: d.url ?? "https://example.com/",
    occurrences: d.occurrences ?? 1,
    sampleUrls: [],
    personas: [],
    detail: "",
    firstSeenAt: "2026-01-01T00:00:00.000Z",
    persona: undefined,
  }));
}

function makeFile(findings: ReturnType<typeof makeFindings>) {
  return {
    meta: {
      runId: "test-run",
      baseUrl: "https://example.com",
      targetClass: "protected",
      startedAt: "2026-01-01T00:00:00.000Z",
    },
    findings,
  };
}

// ── sortBySeverity ─────────────────────────────────────────────────────────────

describe("sortBySeverity", () => {
  it("sorts critical before high before medium", () => {
    const input = makeFindings([
      { id: "a", severity: "medium" },
      { id: "b", severity: "critical" },
      { id: "c", severity: "high" },
    ]);
    const sorted = sortBySeverity(input);
    expect(sorted.map((f) => f.severity)).toEqual(["critical", "high", "medium"]);
  });

  it("sorts equal severity by occurrences descending", () => {
    const input = makeFindings([
      { id: "a", severity: "high", occurrences: 1 },
      { id: "b", severity: "high", occurrences: 5 },
      { id: "c", severity: "high", occurrences: 3 },
    ]);
    const sorted = sortBySeverity(input);
    expect(sorted.map((f) => f.occurrences)).toEqual([5, 3, 1]);
  });

  it("does not mutate the original array", () => {
    const input = makeFindings([{ id: "a", severity: "high" }, { id: "b", severity: "critical" }]);
    const original = [...input];
    sortBySeverity(input);
    expect(input).toEqual(original);
  });
});

// ── computeDiff ───────────────────────────────────────────────────────────────

describe("computeDiff — new findings (regressions)", () => {
  it("returns empty newFindings when both runs are identical", () => {
    const f = makeFindings([{ id: "abc123" }]);
    const { newFindings } = computeDiff(makeFile(f), makeFile(f));
    expect(newFindings).toHaveLength(0);
  });

  it("detects a new finding in current that was not in baseline", () => {
    const baseline = makeFile(makeFindings([{ id: "aaa" }]));
    const current = makeFile(makeFindings([{ id: "aaa" }, { id: "bbb", severity: "critical" }]));
    const { newFindings } = computeDiff(baseline, current);
    expect(newFindings).toHaveLength(1);
    expect(newFindings[0]?.id).toBe("bbb");
  });

  it("exposes critHighNew as subset of new findings at critical/high", () => {
    const baseline = makeFile([]);
    const current = makeFile(
      makeFindings([
        { id: "c1", severity: "critical" },
        { id: "h1", severity: "high" },
        { id: "m1", severity: "medium" },
      ]),
    );
    const { newFindings, critHighNew } = computeDiff(baseline, current);
    expect(newFindings).toHaveLength(3);
    expect(critHighNew).toHaveLength(2);
    expect(critHighNew.every((f) => ["critical", "high"].includes(f.severity))).toBe(true);
  });

  it("new findings are sorted by severity", () => {
    const baseline = makeFile([]);
    const current = makeFile(
      makeFindings([
        { id: "a", severity: "low" },
        { id: "b", severity: "critical" },
        { id: "c", severity: "high" },
      ]),
    );
    const { newFindings } = computeDiff(baseline, current);
    expect(newFindings.map((f) => f.severity)).toEqual(["critical", "high", "low"]);
  });
});

describe("computeDiff — resolved findings", () => {
  it("detects a finding from baseline that is gone in current", () => {
    const baseline = makeFile(makeFindings([{ id: "gone" }, { id: "still-here" }]));
    const current = makeFile(makeFindings([{ id: "still-here" }]));
    const { resolvedFindings } = computeDiff(baseline, current);
    expect(resolvedFindings).toHaveLength(1);
    expect(resolvedFindings[0]?.id).toBe("gone");
  });

  it("returns empty resolvedFindings when nothing was fixed", () => {
    const f = makeFindings([{ id: "x" }]);
    const { resolvedFindings } = computeDiff(makeFile(f), makeFile(f));
    expect(resolvedFindings).toHaveLength(0);
  });
});

describe("computeDiff — stable findings", () => {
  it("classifies a finding present in both runs as stable", () => {
    const f = makeFindings([{ id: "stable-id" }]);
    const { stableFindings } = computeDiff(makeFile(f), makeFile(f));
    expect(stableFindings).toHaveLength(1);
    expect(stableFindings[0]?.id).toBe("stable-id");
  });
});

describe("computeDiff — occurrence changes", () => {
  it("detects when a stable finding's occurrence count increased", () => {
    const baseline = makeFile(makeFindings([{ id: "x", occurrences: 2 }]));
    const current = makeFile(makeFindings([{ id: "x", occurrences: 5 }]));
    const { occurrenceChanges } = computeDiff(baseline, current);
    expect(occurrenceChanges).toHaveLength(1);
    expect(occurrenceChanges[0]?.before).toBe(2);
    expect(occurrenceChanges[0]?.after).toBe(5);
  });

  it("detects when a stable finding's occurrence count decreased", () => {
    const baseline = makeFile(makeFindings([{ id: "x", occurrences: 10 }]));
    const current = makeFile(makeFindings([{ id: "x", occurrences: 3 }]));
    const { occurrenceChanges } = computeDiff(baseline, current);
    expect(occurrenceChanges).toHaveLength(1);
    expect(occurrenceChanges[0]?.before).toBe(10);
    expect(occurrenceChanges[0]?.after).toBe(3);
  });

  it("does not flag a stable finding whose count is unchanged", () => {
    const f = makeFindings([{ id: "x", occurrences: 4 }]);
    const { occurrenceChanges } = computeDiff(makeFile(f), makeFile(f));
    expect(occurrenceChanges).toHaveLength(0);
  });
});

describe("computeDiff — empty inputs", () => {
  it("handles two empty runs with no findings", () => {
    const empty = makeFile([]);
    const { newFindings, resolvedFindings, stableFindings, occurrenceChanges, critHighNew } =
      computeDiff(empty, empty);
    expect(newFindings).toHaveLength(0);
    expect(resolvedFindings).toHaveLength(0);
    expect(stableFindings).toHaveLength(0);
    expect(occurrenceChanges).toHaveLength(0);
    expect(critHighNew).toHaveLength(0);
  });

  it("handles baseline with findings, current empty — all resolved", () => {
    const baseline = makeFile(makeFindings([{ id: "a" }, { id: "b" }]));
    const { resolvedFindings, newFindings } = computeDiff(baseline, makeFile([]));
    expect(resolvedFindings).toHaveLength(2);
    expect(newFindings).toHaveLength(0);
  });

  it("handles baseline empty, current with findings — all new", () => {
    const current = makeFile(makeFindings([{ id: "a" }, { id: "b" }]));
    const { newFindings, resolvedFindings } = computeDiff(makeFile([]), current);
    expect(newFindings).toHaveLength(2);
    expect(resolvedFindings).toHaveLength(0);
  });
});

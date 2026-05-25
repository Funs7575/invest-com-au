/**
 * Tests for lib/snapshot-retention.ts
 *
 * Covers the pure prune-selection helper `selectSnapshotIdsToDelete`.
 * No I/O, no mocks needed — all inputs are plain arrays.
 *
 * Policy under test:
 *   - Keep all rows captured within the last RETENTION_DAYS (parameterised).
 *   - For rows older than that cutoff: keep one "monthly anchor" (the earliest
 *     captured row) per (groupKey × calendar month).
 *   - Delete all remaining old rows (intra-month daily duplicates).
 */

import { describe, it, expect } from "vitest";
import {
  selectSnapshotIdsToDelete,
  type SnapshotRow,
} from "@/lib/snapshot-retention";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Reference "now" pinned to 2026-05-25T00:00:00Z for deterministic tests. */
const NOW_ISO = "2026-05-25T00:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();

/** Build a SnapshotRow from a compact spec. */
function row(
  id: string | number,
  capturedAt: string,
  groupKey = "broker:1:savings_account",
): SnapshotRow {
  return { id, captured_at: capturedAt, groupKey };
}

/** Returns a date that is `days` days before NOW_MS, as ISO string. */
function daysAgo(days: number): string {
  return new Date(NOW_MS - days * 24 * 60 * 60 * 1000).toISOString();
}

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("selectSnapshotIdsToDelete — edge cases", () => {
  it("returns empty result for empty input", () => {
    const result = selectSnapshotIdsToDelete([], 90, NOW_MS);
    expect(result.toDelete).toEqual([]);
    expect(result.kept).toEqual([]);
    expect(result.candidateCount).toBe(0);
    expect(result.anchorCount).toBe(0);
  });

  it("never deletes a single row, even if old", () => {
    const rows = [row("a", daysAgo(200))];
    const { toDelete, kept } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(toDelete).toEqual([]);
    expect(kept).toContain("a");
  });

  it("never deletes when all rows are within the retention window", () => {
    const rows = [
      row("a", daysAgo(10)),
      row("b", daysAgo(20)),
      row("c", daysAgo(89)),
    ];
    const { toDelete } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(toDelete).toEqual([]);
  });

  it("treats the exact cutoff boundary as recent (not old)", () => {
    // A row captured exactly at the cutoff instant should NOT be deleted.
    const cutoffMs = NOW_MS - 90 * 24 * 60 * 60 * 1000;
    const rows = [row("boundary", new Date(cutoffMs).toISOString())];
    const { toDelete } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(toDelete).toEqual([]);
  });
});

// ─── Recent-only behaviour ────────────────────────────────────────────────────

describe("selectSnapshotIdsToDelete — all rows are recent", () => {
  it("returns empty toDelete when all rows are within window", () => {
    const rows = [
      row(1, daysAgo(1)),
      row(2, daysAgo(45)),
      row(3, daysAgo(89)),
    ];
    const { toDelete, kept, candidateCount } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(toDelete).toEqual([]);
    expect(candidateCount).toBe(0);
    expect(kept).toHaveLength(3);
  });
});

// ─── Monthly anchor behaviour ─────────────────────────────────────────────────

describe("selectSnapshotIdsToDelete — monthly anchors", () => {
  it("keeps the earliest row per (groupKey, month) as the anchor", () => {
    // Three rows for the same group in the same month (January 2026 — >90d ago)
    // The earliest (jan-01) should be the anchor; the others deleted.
    const rows = [
      row("jan-01", "2026-01-01T00:00:00Z"),
      row("jan-15", "2026-01-15T00:00:00Z"),
      row("jan-28", "2026-01-28T00:00:00Z"),
    ];
    const { toDelete, kept, anchorCount } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(anchorCount).toBe(1);
    expect(kept).toContain("jan-01");
    expect(toDelete).toContain("jan-15");
    expect(toDelete).toContain("jan-28");
    expect(toDelete).not.toContain("jan-01");
  });

  it("keeps one anchor per calendar month for a group", () => {
    // Two months of old data — two anchors should survive.
    const rows = [
      row("nov-01", "2025-11-01T00:00:00Z"),
      row("nov-10", "2025-11-10T00:00:00Z"),
      row("dec-01", "2025-12-01T00:00:00Z"),
      row("dec-20", "2025-12-20T00:00:00Z"),
    ];
    const { toDelete, kept, anchorCount } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(anchorCount).toBe(2);
    expect(kept).toContain("nov-01");
    expect(kept).toContain("dec-01");
    expect(toDelete).toContain("nov-10");
    expect(toDelete).toContain("dec-20");
  });

  it("keeps anchors per group independently (different groupKeys have their own anchors)", () => {
    // Two groups, each with two old rows in the same month.
    const rows = [
      row("g1-early", "2025-10-01T00:00:00Z", "broker:1:savings"),
      row("g1-late",  "2025-10-15T00:00:00Z", "broker:1:savings"),
      row("g2-early", "2025-10-05T00:00:00Z", "broker:2:savings"),
      row("g2-late",  "2025-10-20T00:00:00Z", "broker:2:savings"),
    ];
    const { toDelete, kept, anchorCount } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(anchorCount).toBe(2);  // one anchor per group×month combination
    expect(kept).toContain("g1-early");
    expect(kept).toContain("g2-early");
    expect(toDelete).toContain("g1-late");
    expect(toDelete).toContain("g2-late");
  });

  it("a group with only one old row per month never generates a deletion", () => {
    // One row per month — all should be kept as anchors.
    const rows = [
      row("aug-a", "2025-08-14T00:00:00Z"),
      row("sep-a", "2025-09-14T00:00:00Z"),
      row("oct-a", "2025-10-14T00:00:00Z"),
    ];
    const { toDelete, anchorCount } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(toDelete).toEqual([]);
    expect(anchorCount).toBe(3);
  });
});

// ─── Mixed recent + old rows ──────────────────────────────────────────────────

describe("selectSnapshotIdsToDelete — mixed recent + old rows", () => {
  it("keeps recent rows intact while pruning old daily duplicates", () => {
    const rows = [
      // Recent — must never be deleted
      row("recent-1", daysAgo(1)),
      row("recent-2", daysAgo(30)),
      row("recent-3", daysAgo(89)),
      // Old — January 2026, same group: earliest becomes anchor
      row("old-jan-01", "2026-01-01T00:00:00Z"),
      row("old-jan-10", "2026-01-10T00:00:00Z"),
      row("old-jan-20", "2026-01-20T00:00:00Z"),
    ];
    const { toDelete, kept } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);

    // All three recent rows must be in kept
    expect(kept).toContain("recent-1");
    expect(kept).toContain("recent-2");
    expect(kept).toContain("recent-3");

    // Anchor (earliest in Jan) kept; duplicates deleted
    expect(kept).toContain("old-jan-01");
    expect(toDelete).toContain("old-jan-10");
    expect(toDelete).toContain("old-jan-20");

    // Exactly two rows deleted
    expect(toDelete).toHaveLength(2);
  });

  it("candidateCount reflects only the old rows, not recent ones", () => {
    const rows = [
      row("r1", daysAgo(10)),    // recent
      row("o1", daysAgo(100)),   // old
      row("o2", daysAgo(110)),   // old, same month as o1 if ≥ retention window
    ];
    const { candidateCount } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    // The exact count depends on whether o1/o2 fall in the same calendar month,
    // but either way it should equal the number of old rows (2).
    expect(candidateCount).toBe(2);
  });
});

// ─── Custom retention window ──────────────────────────────────────────────────

describe("selectSnapshotIdsToDelete — custom retentionDays", () => {
  it("respects a shorter retention window (30 days)", () => {
    // With retentionDays=30 and NOW=2026-05-25:
    //   cutoff = 2026-04-25T00:00:00Z
    //   daysAgo(29) = 2026-04-26 → recent
    //   daysAgo(30) = 2026-04-25 → boundary, exactly at cutoff → recent (≥ cutoff)
    //   daysAgo(40) = 2026-04-15 → old (before cutoff, in April 2026)
    //   daysAgo(50) = 2026-04-05 → old (before cutoff, in April 2026)
    // o1 (Apr-05) is earlier than o2 (Apr-15) in the same month, so o1 is the anchor.
    const rows = [
      row("r1", daysAgo(29)),   // recent
      row("r2", daysAgo(30)),   // boundary — still recent (≥ cutoff)
      row("o1", daysAgo(50)),   // old — earliest in April → becomes the anchor
      row("o2", daysAgo(40)),   // old — same month as o1, later → deleted
    ];
    const { toDelete, kept } = selectSnapshotIdsToDelete(rows, 30, NOW_MS);
    expect(kept).toContain("r1");
    expect(kept).toContain("r2");
    // o1 is the earliest old row in April — it becomes the anchor
    expect(kept).toContain("o1");
    expect(toDelete).not.toContain("o1");
    // o2 is a later duplicate in the same month — it gets pruned
    expect(toDelete).toContain("o2");
  });
});

// ─── ID types ─────────────────────────────────────────────────────────────────

describe("selectSnapshotIdsToDelete — ID types", () => {
  it("works with numeric IDs (broker_health_score_history uses integer PK)", () => {
    const rows: SnapshotRow[] = [
      { id: 1001, captured_at: "2025-10-01T00:00:00Z", groupKey: "commsec" },
      { id: 1002, captured_at: "2025-10-15T00:00:00Z", groupKey: "commsec" },
    ];
    const { toDelete, kept } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(kept).toContain(1001);
    expect(toDelete).toContain(1002);
  });

  it("works with UUID string IDs (savings_rate_snapshots uses UUID PK)", () => {
    const uuid1 = "00000000-0000-0000-0000-000000000001";
    const uuid2 = "00000000-0000-0000-0000-000000000002";
    const rows: SnapshotRow[] = [
      { id: uuid1, captured_at: "2025-10-01T00:00:00Z", groupKey: "broker:5:savings_account" },
      { id: uuid2, captured_at: "2025-10-20T00:00:00Z", groupKey: "broker:5:savings_account" },
    ];
    const { toDelete, kept } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    expect(kept).toContain(uuid1);
    expect(toDelete).toContain(uuid2);
  });
});

// ─── Large-scale invariant ────────────────────────────────────────────────────

describe("selectSnapshotIdsToDelete — invariants", () => {
  it("toDelete + kept covers every input ID exactly once", () => {
    const rows = [
      row("a", daysAgo(5)),
      row("b", daysAgo(95)),
      row("c", "2025-10-01T00:00:00Z"),
      row("d", "2025-10-15T00:00:00Z"),
      row("e", "2025-09-01T00:00:00Z"),
      row("f", "2025-09-28T00:00:00Z"),
    ];
    const { toDelete, kept } = selectSnapshotIdsToDelete(rows, 90, NOW_MS);
    const allOutput = new Set([...toDelete, ...kept]);
    for (const r of rows) {
      expect(allOutput.has(r.id)).toBe(true);
    }
    // No ID appears in both lists
    const deleteSet = new Set(toDelete);
    for (const id of kept) {
      expect(deleteSet.has(id)).toBe(false);
    }
  });
});

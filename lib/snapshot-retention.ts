/**
 * lib/snapshot-retention.ts
 *
 * Pure helper for selecting snapshot rows to prune from append-only history
 * tables (savings_rate_snapshots, broker_health_score_history).
 *
 * Retention policy:
 *   - Keep ALL rows captured within the last N days (default 90).
 *   - For rows older than N days, keep the EARLIEST row per
 *     (group key, calendar month) as a "monthly anchor" so long-range
 *     trend charts and rate-alert history remain intact.
 *   - Delete all other rows older than N days (intra-month daily duplicates).
 *
 * Design constraints:
 *   - Pure functions only — no I/O. Unit-testable without a DB.
 *   - Caller is responsible for fetching candidate rows and executing deletes.
 *   - `retentionDays` is parameterised so tests can exercise small windows.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal shape required from a savings_rate_snapshots row.
 * `groupKey` is a caller-supplied composite key (e.g. `${broker_id}:${product_kind}`).
 */
export interface SnapshotRow {
  /** Stable row identifier (UUID string for savings_rate_snapshots, number for health). */
  id: string | number;
  /** ISO-8601 timestamp, e.g. "2025-08-14T06:00:00Z". */
  captured_at: string;
  /** Caller-supplied partition key that defines "same product/broker". */
  groupKey: string;
}

/**
 * Result of the prune-selection pass.
 *
 * `toDelete` contains the IDs of rows that may safely be deleted.
 * `kept` is informational — the IDs that were retained (anchors + recent).
 */
export interface PruneSelection {
  toDelete: Array<string | number>;
  kept: Array<string | number>;
  /** Count of rows older than retentionDays (before monthly-anchor filtering). */
  candidateCount: number;
  /** Count of monthly anchors retained. */
  anchorCount: number;
}

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Given an array of snapshot rows, return the IDs that should be deleted.
 *
 * Algorithm:
 *   1. Partition rows into "recent" (within retentionDays of `now`) and
 *      "old" (outside that window).
 *   2. For the "old" bucket, group by `(groupKey, YYYY-MM)` (calendar month).
 *   3. Within each group, keep the row with the smallest `captured_at`
 *      (the earliest snapshot for that group in that month = the monthly anchor).
 *   4. All other old rows are scheduled for deletion.
 *
 * Edge cases:
 *   - Empty input → empty result.
 *   - Single row (old or recent) → never deleted.
 *   - All rows are recent → nothing deleted.
 *   - Multiple rows in one month for a group → only the earliest is kept.
 *
 * @param rows         Candidate rows to evaluate (may include recent rows).
 * @param retentionDays Days to retain unconditionally (default 90).
 * @param now          Reference time for age calculations (default Date.now()).
 */
export function selectSnapshotIdsToDelete(
  rows: SnapshotRow[],
  retentionDays = 90,
  now: number = Date.now(),
): PruneSelection {
  if (rows.length === 0) {
    return { toDelete: [], kept: [], candidateCount: 0, anchorCount: 0 };
  }

  const cutoffMs = now - retentionDays * 24 * 60 * 60 * 1000;

  const recentIds = new Set<string | number>();
  const oldRows: SnapshotRow[] = [];

  for (const row of rows) {
    const ts = new Date(row.captured_at).getTime();
    if (Number.isNaN(ts) || ts >= cutoffMs) {
      recentIds.add(row.id);
    } else {
      oldRows.push(row);
    }
  }

  if (oldRows.length === 0) {
    return {
      toDelete: [],
      kept: [...recentIds],
      candidateCount: 0,
      anchorCount: 0,
    };
  }

  // Group old rows by (groupKey, YYYY-MM) and find the earliest per group.
  // "earliest" = smallest captured_at string (ISO lexicographic order is
  // chronological for UTC timestamps with the same TZ offset).
  const monthGroups = new Map<string, SnapshotRow>();

  for (const row of oldRows) {
    const month = row.captured_at.slice(0, 7); // "YYYY-MM"
    const key = `${row.groupKey}::${month}`;
    const existing = monthGroups.get(key);
    if (!existing || row.captured_at < existing.captured_at) {
      monthGroups.set(key, row);
    }
  }

  const anchorIds = new Set<string | number>();
  for (const anchor of monthGroups.values()) {
    anchorIds.add(anchor.id);
  }

  const toDelete: Array<string | number> = [];
  const kept: Array<string | number> = [...recentIds];

  for (const row of oldRows) {
    if (anchorIds.has(row.id)) {
      kept.push(row.id);
    } else {
      toDelete.push(row.id);
    }
  }

  return {
    toDelete,
    kept,
    candidateCount: oldRows.length,
    anchorCount: anchorIds.size,
  };
}

/**
 * Generic scenario compare — per-field deltas across ANY two scenarios of the
 * same `calculator_key`.
 *
 * `lib/scenario-delta.ts` computes deltas for the Scenario Planner's fixed
 * `ScenarioResult` shape. The Scenario Workspace compares arbitrary calculators,
 * whose inputs/snapshots are opaque key/value blobs — so this module reuses the
 * SAME neutral-language contract (`DeltaSize` = "larger" | "smaller" | "equal",
 * absolute + percentage delta from A's perspective) but applies it field-by-field
 * to whatever scalar fields the two blobs share. No "better/worse" framing — the
 * size indicator is factual (numerical relationship), never a recommendation.
 *
 * Pure functions — no React, no I/O.
 */

import { type DeltaSize } from "@/lib/scenario-delta";
import { humaniseFieldKey, formatScenarioValue } from "@/lib/scenario-format";

export type { DeltaSize };

export interface FieldDeltaRow {
  /** Raw field key (e.g. "currentSuperBalance"). */
  key: string;
  /** Humanised label for display. */
  label: string;
  /** Display strings per scenario (formatted), one per compared scenario. */
  displays: string[];
  /**
   * Numeric values per scenario, or null where the field is missing /
   * non-numeric for that scenario. Length matches `displays`.
   */
  values: Array<number | null>;
  /** Whether every present value across scenarios is numeric (delta-able). */
  numeric: boolean;
  /**
   * Absolute delta of the LAST scenario vs the FIRST (values[n-1] - values[0]),
   * null when either endpoint is non-numeric. For the 2-scenario case this is
   * simply B − A.
   */
  absoluteDelta: number | null;
  /** Percentage delta relative to the first value; null when first is 0/missing. */
  pctDelta: number | null;
  /** Neutral size of the LAST scenario relative to the FIRST. */
  size: DeltaSize;
}

const EQUAL_EPSILON = 0.005;

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sizeOf(delta: number | null): DeltaSize {
  if (delta === null) return "equal";
  if (Math.abs(delta) < EQUAL_EPSILON) return "equal";
  return delta > 0 ? "larger" : "smaller";
}

/**
 * Build the row set for a side-by-side compare of 2-3 blobs (all the same
 * `calculator_key`). The field universe is the union of all blobs' scalar keys,
 * ordered by first appearance. Each row carries per-scenario display strings +
 * the neutral delta of the last vs the first scenario.
 *
 * `blobs` are the per-scenario objects to compare (inputs OR snapshots). Order
 * matters: index 0 is the baseline ("A"); the delta is computed against it.
 */
export function compareScenarioBlobs(
  blobs: Array<Record<string, unknown> | null | undefined>,
): FieldDeltaRow[] {
  // Union of scalar keys, in first-seen order.
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const blob of blobs) {
    if (!blob) continue;
    for (const [k, v] of Object.entries(blob)) {
      if (v !== null && typeof v === "object") continue; // scalars only
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }

  return keys.map((key): FieldDeltaRow => {
    const rawValues = blobs.map((b) => (b ? b[key] : undefined));
    const values = rawValues.map(toNumber);
    const displays = rawValues.map((v) => formatScenarioValue(key, v));
    // "numeric" ⇒ every value that is actually present parses as a number, and
    // at least one is present. Missing values (undefined/null/"") don't break it.
    const presentRaw = rawValues.filter(
      (v) => v !== undefined && v !== null && v !== "",
    );
    const presentNumeric = values.filter((v) => v !== null);
    const numeric =
      presentNumeric.length > 0 && presentNumeric.length === presentRaw.length;

    const first = values[0] ?? null;
    const last = values[values.length - 1] ?? null;
    const absoluteDelta =
      first !== null && last !== null ? last - first : null;
    const pctDelta =
      absoluteDelta !== null && first !== null && first !== 0
        ? (absoluteDelta / Math.abs(first)) * 100
        : null;

    return {
      key,
      label: humaniseFieldKey(key),
      displays,
      values,
      numeric,
      absoluteDelta,
      pctDelta,
      size: sizeOf(absoluteDelta),
    };
  });
}

/** Format a signed delta for display, e.g. "+1,200 (+8.0%)" or "—". */
export function formatFieldDelta(row: FieldDeltaRow): string {
  if (row.absoluteDelta === null || Math.abs(row.absoluteDelta) < EQUAL_EPSILON) {
    return "—";
  }
  const sign = row.absoluteDelta > 0 ? "+" : "−";
  const absDisplay = formatScenarioValue(row.key, Math.abs(row.absoluteDelta));
  const pct =
    row.pctDelta !== null
      ? ` (${row.absoluteDelta > 0 ? "+" : "−"}${Math.abs(row.pctDelta).toFixed(1)}%)`
      : "";
  return `${sign}${absDisplay}${pct}`;
}

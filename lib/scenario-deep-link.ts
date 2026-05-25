/**
 * Scenario deep-link helpers — pure utilities for the ?scenario= URL param
 * that lets the Pro dashboard link directly into a saved scenario.
 *
 * Keeping these separate from ScenarioPlannerClient gives us:
 *   - Pure functions that are trivially unit-testable without React.
 *   - A single import point for dashboard preview assembly.
 *
 * No I/O, no React, no Next.js — intentionally portable.
 */

import type { ScenarioPlannerSnapshot } from "@/lib/scenario-engine";

export type SavedScenarioRow = ScenarioPlannerSnapshot["scenarios"][number];

// ─── Deep-link param parsing ───────────────────────────────────────────────────

/**
 * Given the raw `?scenario=` query-param value and the list of saved scenarios,
 * return the 0-based index of the matching scenario, or -1 if none matches.
 *
 * Matching strategy (in priority order):
 *   1. Numeric string → treat as 0-based index (e.g. "0", "1", "2").
 *   2. Non-numeric string → case-insensitive match against `scenario.label`.
 *
 * The numeric-first approach means callers may encode either the positional
 * index (stable for the current session) or the human label (stable across
 * reorders). Both work.
 */
export function resolveScenarioParam(
  param: string | null | undefined,
  scenarios: readonly SavedScenarioRow[],
): number {
  if (!param || scenarios.length === 0) return -1;

  const trimmed = param.trim();

  // Numeric index path
  if (/^\d+$/.test(trimmed)) {
    const idx = parseInt(trimmed, 10);
    return idx >= 0 && idx < scenarios.length ? idx : -1;
  }

  // Label match (case-insensitive, trim)
  const lower = trimmed.toLowerCase();
  const found = scenarios.findIndex((s) => s.label.trim().toLowerCase() === lower);
  return found;
}

// ─── Dashboard preview assembly ───────────────────────────────────────────────

export interface ScenarioPreview {
  /** Scenario label (user-given name). */
  label: string;
  /** Projected super at retirement, formatted for display. */
  projectedSuper: number;
  /** Whether the scenario is on track per the 4% rule. */
  isOnTrack: boolean;
  /** Gap to the 4% rule target (positive = deficit, negative = surplus). */
  gapToTarget: number;
  /** Number of drawdown years projected. */
  drawdownYears: number;
  /**
   * Deep-link href. Uses numeric index so it is stable regardless of label
   * changes (label is mutable; position in the array is stable for the session).
   */
  resumeHref: string;
}

/**
 * Build an array of `ScenarioPreview` objects for the dashboard card.
 *
 * Pure function — takes the raw `scenarios` array from the persisted snapshot
 * and returns typed preview objects with pre-formatted metrics + deep-link hrefs.
 *
 * Returns an empty array when `scenarios` is undefined/null so the dashboard
 * can handle the empty state without extra null guards.
 */
export function assembleSavedScenarioPreviews(
  scenarios: readonly SavedScenarioRow[] | undefined | null,
): ScenarioPreview[] {
  if (!scenarios || scenarios.length === 0) return [];

  return scenarios.map((s, idx): ScenarioPreview => ({
    label: s.label,
    projectedSuper: s.summary.projectedSuperAtRetirement,
    isOnTrack: s.summary.isOnTrack,
    gapToTarget: s.summary.gapToTarget,
    drawdownYears: s.summary.drawdownYears,
    resumeHref: `/scenarios/plan?scenario=${idx}`,
  }));
}

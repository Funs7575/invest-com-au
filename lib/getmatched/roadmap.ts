/**
 * lib/getmatched/roadmap.ts
 *
 * Get Matched Showcase G6 (docs/plans/GET_MATCHED_SHOWCASE.md): "plan as
 * roadmap". Turns the flat result checklist into a grouped Today / This week /
 * This month structure so the plan reads as a generated, time-phased roadmap
 * rather than an undifferentiated to-do list.
 *
 * Pure — no I/O, deterministic. The grouping is DISPLAY-ONLY: checklist
 * persistence (`/api/get-matched/plans/[id]/checklist`) toggles by the item's
 * ORIGINAL index, so every grouped item carries its `index` from the source
 * array. The UI must wire toggles via `item.index`, never the position within
 * a phase.
 */

import type { ChecklistItem } from "./types";

export type RoadmapPhaseKey = "today" | "this_week" | "this_month";

/** A checklist item plus the original index it occupied in the flat array. */
export interface RoadmapItem extends ChecklistItem {
  /** Original index in the source checklist — the toggle key. Never reassign. */
  index: number;
}

export interface RoadmapPhase {
  key: RoadmapPhaseKey;
  /** Display label for the phase header. */
  label: string;
  items: RoadmapItem[];
}

/**
 * Group a flat checklist into Today / This week / This month phases.
 *
 * Grouping rule (display-only, deterministic):
 *   - first 2 items   → Today
 *   - next 2 items    → This week
 *   - remaining items → This month
 *   - when there are ≤3 items, everything stays in Today / This week (no
 *     "This month" phase) so a short plan doesn't look padded.
 *
 * Empty phases are omitted from the returned array. Every item keeps its
 * original index for checklist-toggle wiring.
 */
export function groupChecklist(items: ChecklistItem[]): RoadmapPhase[] {
  const withIndex: RoadmapItem[] = items.map((item, index) => ({
    ...item,
    index,
  }));

  const today: RoadmapItem[] = [];
  const thisWeek: RoadmapItem[] = [];
  const thisMonth: RoadmapItem[] = [];

  // ≤3 items: split across Today (first 2) + This week (rest); no This month.
  const small = withIndex.length <= 3;

  withIndex.forEach((item) => {
    if (item.index < 2) {
      today.push(item);
    } else if (item.index < 4 || small) {
      thisWeek.push(item);
    } else {
      thisMonth.push(item);
    }
  });

  const phases: RoadmapPhase[] = [
    { key: "today", label: "Today", items: today },
    { key: "this_week", label: "This week", items: thisWeek },
    { key: "this_month", label: "This month", items: thisMonth },
  ];

  return phases.filter((p) => p.items.length > 0);
}

const TIMELINE_BADGE_LABEL: Record<string, string> = {
  now: "Now",
  "1_3_months": "1–3 months",
  "3_6_months": "3–6 months",
  "6_12_months": "6–12 months",
  researching: "Just researching",
};

/**
 * Display label for the user's stated timeline, used as a badge on the
 * roadmap header ("Your timeline: 3–6 months"). Returns null when the
 * timeline is unset or unrecognised so the badge can be hidden.
 */
export function timelineBadgeLabel(
  timeline: string | null | undefined,
): string | null {
  if (!timeline) return null;
  return TIMELINE_BADGE_LABEL[timeline] ?? null;
}

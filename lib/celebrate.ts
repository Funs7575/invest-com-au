"use client";

/**
 * Client-side celebration dispatcher (RETAIL_UX_NORTHSTAR §5 D1/D7).
 * Combines the pure milestone registry with the toast engine and analytics.
 * All copy lives in lib/milestones.ts; all visuals in components/Toast.tsx.
 */

import { showRichToast, showToast } from "@/components/Toast";
import { MILESTONES, recordMilestone, type MilestoneKey } from "@/lib/milestones";
import { trackEvent } from "@/lib/tracking";

/**
 * Unlock-and-celebrate a milestone. Fires the rich toast + analytics only
 * on first unlock; subsequent calls are silent no-ops. Returns whether the
 * milestone was newly unlocked.
 */
export function celebrateMilestone(
  key: MilestoneKey,
  overrides?: { title?: string; body?: string; actionLabel?: string; actionHref?: string },
): boolean {
  const isNew = recordMilestone(key);
  if (!isNew) return false;
  const spec = MILESTONES[key];
  showRichToast({
    title: overrides?.title ?? spec.title,
    body: overrides?.body ?? spec.body,
    icon: spec.icon,
    milestone: spec.big,
    actionLabel: overrides?.actionLabel,
    actionHref: overrides?.actionHref,
  });
  trackEvent("milestone_unlocked", { milestone: key });
  return true;
}

/**
 * Unified save feedback for every save-shaped button (D1).
 * First save ever → the "shortlist is born" milestone moment.
 * Every later save → light confirmation; removal → light confirmation.
 */
export function celebrateSave(opts: { saved: boolean; label?: string }): void {
  if (!opts.saved) {
    showToast(opts.label ? `Removed ${opts.label}` : "Removed");
    return;
  }
  const wasFirst = celebrateMilestone("first_save", {
    actionLabel: "Where saves live →",
    actionHref: "/account/my-saves",
  });
  if (wasFirst) {
    trackEvent("save_first", {});
    return;
  }
  showToast(opts.label ? `Saved — ${opts.label}` : "Saved");
}

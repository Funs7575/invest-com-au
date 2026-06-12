"use client";

/**
 * Journey-moment dispatcher (Feel layer v2 — restores the module PR
 * #1561's consumers import; the original never landed with that merge).
 *
 * Thin façade over the milestone celebration pipeline so funnel surfaces
 * fire journey beats without importing the registry internals. Once-ever
 * semantics come from the registry itself.
 */

import { celebrateMilestone } from "@/lib/celebrate";
import type { MilestoneKey } from "@/lib/milestones";

/** Fires a journey moment; returns true only on first unlock. */
export function fireJourneyMoment(key: MilestoneKey): boolean {
  return celebrateMilestone(key);
}

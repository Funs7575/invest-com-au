/**
 * Forum reputation → advisor credibility boost (Idea #9).
 *
 * Advisors who are genuinely helpful, active forum contributors earn a
 * SMALL, BOUNDED boost to their marketplace ranking. Rewards real
 * community contribution and is hard for competitors to fake (you'd have
 * to actually accrue reputation over time). The link is
 * professionals.auth_user_id ↔ forum_user_profiles.user_id.
 *
 * Deliberately bounded + capped so it tweaks ordering at the margin and
 * can never dominate the substantive ranking signals (rating, response
 * time, verification).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("advisor-credibility");

/** Maximum additive ranker weight this signal can contribute. */
export const MAX_FORUM_BOOST = 0.1;
/** Reputation at/above which the full boost applies. */
const REP_FULL = 500;
/** Reputation below which no boost applies. */
const REP_FLOOR = 50;
/** Activity must be within this window to count as "active". */
const ACTIVE_WINDOW_DAYS = 60;

export interface ForumStanding {
  reputation: number;
  lastActiveAt: string | null;
  status: string;
}

/**
 * Pure: compute the bounded boost from forum standing. Returns a value in
 * [0, MAX_FORUM_BOOST].
 *   - banned / suspended users get 0
 *   - inactive (no activity in ACTIVE_WINDOW_DAYS) get 0
 *   - reputation below REP_FLOOR gets 0
 *   - otherwise linearly scales REP_FLOOR..REP_FULL → 0..MAX_FORUM_BOOST
 */
export function forumCredibilityBoost(
  standing: ForumStanding,
  now: number = Date.now(),
): number {
  if (standing.status !== "active") return 0;
  if (!standing.lastActiveAt) return 0;
  const ageMs = now - Date.parse(standing.lastActiveAt);
  if (Number.isNaN(ageMs) || ageMs > ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000) return 0;
  if (standing.reputation < REP_FLOOR) return 0;

  const clampedRep = Math.min(REP_FULL, standing.reputation);
  const frac = (clampedRep - REP_FLOOR) / (REP_FULL - REP_FLOOR);
  return Math.round(frac * MAX_FORUM_BOOST * 1000) / 1000;
}

/**
 * Resolve an advisor's forum boost. Returns 0 when they have no forum
 * profile, are inactive, or on error.
 */
export async function getAdvisorForumBoost(professionalId: number): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data: prof } = await supabase
      .from("professionals")
      .select("auth_user_id")
      .eq("id", professionalId)
      .maybeSingle();
    const authUserId = prof?.auth_user_id as string | null | undefined;
    if (!authUserId) return 0;

    const { data: forum, error } = await supabase
      .from("forum_user_profiles")
      .select("reputation, last_active, status")
      .eq("user_id", authUserId)
      .maybeSingle();
    if (error || !forum) return 0;

    return forumCredibilityBoost({
      reputation: (forum.reputation as number) ?? 0,
      lastActiveAt: (forum.last_active as string | null) ?? null,
      status: (forum.status as string) ?? "active",
    });
  } catch (err) {
    log.warn("getAdvisorForumBoost threw", {
      professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

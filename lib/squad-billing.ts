/**
 * Squad marketplace tiers (Idea #4).
 *
 * Reader for the squad placement boost the brief-routing sort consumes,
 * plus the tier lookup. Paid tiers (featured/top) carry a higher
 * boost_weight, surfacing those squads ahead of free ones in brief
 * matching. The ranker multiplies its base match score by the boost —
 * default 1.0 (no change) when a squad has no boost row, so this is
 * additive and safe to roll out behind a flag.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("squad-billing");

export type SquadTier = "free" | "featured" | "top";

/** Bounds matched to the squad_placement_boost CHECK constraint. */
export const SQUAD_BOOST_MIN = 0.5;
export const SQUAD_BOOST_MAX = 3.0;

function clampBoost(n: number): number {
  return Math.min(SQUAD_BOOST_MAX, Math.max(SQUAD_BOOST_MIN, n));
}

/**
 * Resolve the placement boost for a squad. Returns 1.0 (no change) when
 * absent / inactive / on error.
 */
export async function getSquadBoost(teamId: number): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("squad_placement_boost")
      .select("boost_weight, active")
      .eq("team_id", teamId)
      .maybeSingle();
    if (error || !data || data.active !== true) return 1.0;
    return clampBoost(Number(data.boost_weight));
  } catch (err) {
    log.warn("getSquadBoost threw", { teamId, err: err instanceof Error ? err.message : String(err) });
    return 1.0;
  }
}

/**
 * Batch boost lookup for a set of squads — one query, used by the
 * brief-routing sort which scores many candidates at once. Missing squads
 * default to 1.0.
 */
export async function getSquadBoosts(teamIds: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  for (const id of teamIds) result.set(id, 1.0);
  if (teamIds.length === 0) return result;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("squad_placement_boost")
      .select("team_id, boost_weight, active")
      .in("team_id", teamIds)
      .eq("active", true);
    if (error || !data) return result;
    for (const row of data) {
      result.set(row.team_id as number, clampBoost(Number(row.boost_weight)));
    }
    return result;
  } catch {
    return result;
  }
}

/**
 * Pure: apply a boost to a base match score. Centralised so the rounding /
 * clamping rule lives in one place.
 */
export function applySquadBoost(baseScore: number, boost: number): number {
  return baseScore * clampBoost(boost);
}

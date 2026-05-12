/**
 * Server-only placement-experiments helpers.
 *
 * Kept separate from `placement-experiments.ts` because Supabase's server
 * client transitively imports `next/headers`, which is forbidden in client
 * bundles. Mirrors the `country-rule-alerts-server.ts` split.
 *
 * The table has anon SELECT on running/paused rows, so we use the anon
 * `createClient()` for read paths — no service role required.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  normaliseMetrics,
  normaliseVariants,
  type PlacementEventType,
  type PlacementExperiment,
} from "@/lib/placement-experiments";

const log = logger("placement-experiments-server");

/**
 * Fetch the single live experiment for a placement slug, if any.
 *
 * Returns null when:
 *   - the slug has no experiment (most common)
 *   - the latest experiment is draft/completed (not live)
 *   - the DB read errors (best-effort — must never break the page render)
 *
 * The unique partial index on `(slug) WHERE status='running'` guarantees at
 * most one running row; we pick the running row if present, else fall back
 * to the most recent paused row (so editorial can pause without losing
 * impression context, then resume).
 */
export async function getActivePlacementExperiment(
  slug: string,
): Promise<PlacementExperiment | null> {
  if (!slug) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("placement_experiments")
      .select(
        "id, slug, name, status, variants, metrics, notes, winner_variant, created_at, updated_at, started_at, ended_at",
      )
      .eq("slug", slug)
      .in("status", ["running", "paused"])
      .order("status", { ascending: true }) // 'paused' > 'running' alphabetically — we want running first, so re-sort below
      .limit(2);

    if (error || !data || data.length === 0) return null;

    // Prefer running over paused when both exist (shouldn't happen given the
    // unique partial index, but be defensive).
    const running = data.find((r) => r.status === "running");
    const row = running ?? data[0];
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status as PlacementExperiment["status"],
      variants: normaliseVariants(row.variants),
      metrics: normaliseMetrics(row.metrics),
      notes: row.notes,
      winner_variant: row.winner_variant,
      created_at: row.created_at,
      updated_at: row.updated_at,
      started_at: row.started_at,
      ended_at: row.ended_at,
    };
  } catch (err) {
    log.warn("getActivePlacementExperiment failed", {
      slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Bump a counter on a live experiment. Best-effort — failures are logged
 * and swallowed so a flaky DB write never breaks the visitor's render.
 *
 * Uses the anon client because the `increment_placement_event` RPC is
 * SECURITY DEFINER + granted to anon — the function elevates privileges
 * internally, so there's no need for service-role RLS bypass here.
 */
export async function recordPlacementEvent(
  experimentId: number,
  variant: string,
  eventType: PlacementEventType,
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("increment_placement_event", {
      p_experiment_id: experimentId,
      p_variant: variant,
      p_event_type: eventType,
    });
    if (error) {
      log.warn("recordPlacementEvent rpc failed", {
        experimentId,
        variant,
        eventType,
        error: error.message,
      });
    }
  } catch (err) {
    log.warn("recordPlacementEvent threw", {
      experimentId,
      variant,
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

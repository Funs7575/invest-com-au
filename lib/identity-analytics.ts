/**
 * Identity / workspace analytics (Ideas #7 + #8).
 *
 * Thin reader over the SQL views in 20260801001800. Powers the
 * multi-hat retention story ("do users who hold N kinds churn less?")
 * and the workspace-usage picture ("which workspaces get used vs
 * abandoned") for the admin dashboard. Read-only; admin-gated app-side.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("identity-analytics");

export interface MultiKindCohort {
  kindsHeld: number;
  principalCount: number;
}

export interface WorkspaceSwitchStat {
  kind: string;
  source: string;
  switchCount: number;
  distinctPrincipals: number;
  lastSwitchAt: string | null;
}

/**
 * How many users hold 1, 2, 3… distinct account kinds. The multi-hat
 * cohort is the retention signal: an advisor who also tracks a portfolio
 * has more reasons to come back.
 */
export async function getMultiKindCohorts(): Promise<MultiKindCohort[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("multi_kind_cohort_stats")
      .select("kinds_held, principal_count")
      .order("kinds_held", { ascending: true });
    if (error) {
      log.warn("getMultiKindCohorts failed", { error: error.message });
      return [];
    }
    return (data ?? []).map((r) => ({
      kindsHeld: r.kinds_held as number,
      principalCount: Number(r.principal_count),
    }));
  } catch (err) {
    log.warn("getMultiKindCohorts threw", { err: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/**
 * Switch volume per (kind, source). Surfaces which workspaces users
 * actually switch into, and via which surface (switcher / chooser /
 * deep_link / callback).
 */
export async function getWorkspaceSwitchStats(): Promise<WorkspaceSwitchStat[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("workspace_switch_stats")
      .select("kind, source, switch_count, distinct_principals, last_switch_at");
    if (error) {
      log.warn("getWorkspaceSwitchStats failed", { error: error.message });
      return [];
    }
    return (data ?? []).map((r) => ({
      kind: r.kind as string,
      source: r.source as string,
      switchCount: Number(r.switch_count),
      distinctPrincipals: Number(r.distinct_principals),
      lastSwitchAt: (r.last_switch_at as string | null) ?? null,
    }));
  } catch (err) {
    log.warn("getWorkspaceSwitchStats threw", { err: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/**
 * Pure helper: share of users who are multi-hat (hold 2+ kinds). Used in
 * the retention narrative + as a single headline metric.
 */
export function multiHatShare(cohorts: ReadonlyArray<MultiKindCohort>): number {
  const total = cohorts.reduce((s, c) => s + c.principalCount, 0);
  if (total === 0) return 0;
  const multi = cohorts
    .filter((c) => c.kindsHeld >= 2)
    .reduce((s, c) => s + c.principalCount, 0);
  return multi / total;
}

/**
 * Group Briefs — pooled demand auctions (idea #17).
 *
 * Clusters consenting consumers with the same need into a demand POOL
 * (brief template × state × calendar month). Advisers respond once with a
 * single structured GROUP OFFER; each member individually accepts (debiting
 * the adviser at a volume discount through the established accept path) or
 * declines.
 *
 * Compliance posture (see docs/strategy/REGULATORY-AVOID-LIST.md):
 *   Pools are LEAD-ROUTING BUNDLES of the advisers' OWN offers. Nothing is
 *   traded, no financial products are matched (no Australian Market Licence
 *   trigger), there is no consumer→adviser money intermediation, and a group
 *   "rate" is the adviser's own quoted package pricing. A member accept debits
 *   the adviser via flat B2B credits — the same advisor_credit_ledger path as
 *   a normal accept, at a discount.
 *
 * Dormancy: every DB-touching entry point is gated by the `demand_pools`
 * feature flag and fails CLOSED. Flag off ⇒ the clustering step is a no-op,
 * pool reads return empty, and nothing 500s if the tables are absent
 * (Supabase errors are swallowed → empty result). Local row types live here;
 * lib/database.types.ts is intentionally NOT edited.
 *
 * Lazy expiry: pools expire at end-of-period. There is no cron — the status
 * flip is applied on read (`isPoolExpiredForRead` / `markPoolExpiredIfDue`).
 */

// eslint-disable-next-line no-restricted-imports -- demand_pools / pool_members / pool_offers are service_role-only by design (anonymous email-keyed surfaces, same posture as engagement_registry); the clustering hook runs server-side with no JWT and the offer/accept paths cross-reference briefs + professionals across users. Service-role is the correct read/write path per CLAUDE.md § "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";

import type { BriefRow } from "./types";

const log = logger("briefs:demand-pools");

/** Feature flag gating the whole Group Briefs surface. Fail-closed. */
export const DEMAND_POOLS_FLAG = "demand_pools";

/** Default pool size bounds (overridable per-row via min_size / max_size). */
export const DEFAULT_POOL_MIN_SIZE = 3;
export const DEFAULT_POOL_MAX_SIZE = 12;

/**
 * Volume discount applied to a member's accept cost, expressed as a
 * percentage off the standard `getAcceptCost` for the brief. The acceptance
 * still flows through the established `acceptBrief` money path (same ledger,
 * same optimistic lock, same rollback) — only the credits charged differ.
 */
export const POOL_ACCEPT_DISCOUNT_PCT = 25;

/**
 * Below this many members a pool's budget-band distribution is suppressed
 * (shown as a single aggregate count, never a per-band breakdown) so a
 * consumer can't be re-identified from a thin cell.
 */
export const DISTRIBUTION_SUPPRESS_THRESHOLD = 3;

// ─── Row types (local — lib/database.types.ts is NOT edited) ──────────────

export type PoolStatus = "forming" | "offered" | "closed" | "expired";
export type PoolMemberStatus = "joined" | "left" | "accepted";
export type PoolOfferStatus = "active" | "withdrawn" | "expired";

export interface DemandPoolRow {
  id: number;
  template_key: string;
  state: string;
  period: string;
  status: PoolStatus;
  min_size: number;
  max_size: number;
  created_at: string;
  updated_at: string;
}

export interface PoolMemberRow {
  id: number;
  pool_id: number;
  brief_id: number;
  consumer_email: string;
  status: PoolMemberStatus;
  joined_at: string;
}

export interface PoolOfferRow {
  id: number;
  pool_id: number;
  professional_id: number;
  body: string;
  package_rate_band: string | null;
  status: PoolOfferStatus;
  created_at: string;
}

// ─── Pure helpers (unit-tested without a DB) ──────────────────────────────

/** Calendar-month bucket for a date, e.g. '2026-06'. */
export function periodForDate(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Compute the discounted credits a pool member's accept costs the adviser.
 * Never below 1 credit; rounds UP so the discount can never zero out the
 * charge. Pure — the caller resolves `baseCost` from `getAcceptCost`.
 */
export function discountedAcceptCost(
  baseCost: number,
  discountPct: number = POOL_ACCEPT_DISCOUNT_PCT,
): number {
  const safeBase = Number.isFinite(baseCost) && baseCost > 0 ? baseCost : 1;
  const pct = Math.min(Math.max(discountPct, 0), 100);
  const discounted = Math.ceil(safeBase * (1 - pct / 100));
  return Math.max(1, discounted);
}

/**
 * A pool is expired (for read purposes) once its period month has fully
 * elapsed — i.e. `now` is in a later month than `period`. Already-terminal
 * pools ('closed'/'expired') are reported as-is.
 */
export function isPoolExpiredForRead(
  pool: Pick<DemandPoolRow, "period" | "status">,
  now: Date = new Date(),
): boolean {
  if (pool.status === "expired") return true;
  if (pool.status === "closed") return false;
  return periodForDate(now) > pool.period;
}

export interface BudgetDistributionCell {
  band: string;
  count: number;
}

export interface BudgetDistribution {
  /** Total members counted. */
  total: number;
  /** Per-band breakdown, or null when suppressed (total < threshold). */
  cells: BudgetDistributionCell[] | null;
  suppressed: boolean;
}

/**
 * Build an anonymised budget-band distribution from member budget bands.
 * Suppressed entirely (cells = null) below n=3 so a single member can't be
 * profiled. Bands are returned in input order of first appearance.
 */
export function buildBudgetDistribution(
  budgetBands: (string | null | undefined)[],
  suppressThreshold: number = DISTRIBUTION_SUPPRESS_THRESHOLD,
): BudgetDistribution {
  const bands = budgetBands.map((b) => (b && b.length > 0 ? b : "not_sure"));
  const total = bands.length;
  if (total < suppressThreshold) {
    return { total, cells: null, suppressed: true };
  }
  const counts = new Map<string, number>();
  for (const b of bands) counts.set(b, (counts.get(b) ?? 0) + 1);
  const cells = Array.from(counts.entries()).map(([band, count]) => ({ band, count }));
  return { total, cells, suppressed: false };
}

/**
 * Whether a brief is shape-eligible to join a pool. Mirrors the inbox
 * "available" gate plus the requirements pooling needs (a template and a
 * state to cluster on, and an open accept-flow brief that isn't taken). Pure.
 */
export function isBriefPoolEligible(brief: BriefRow): boolean {
  if (brief.flow_type !== "accept") return false;
  if (brief.status !== "open") return false;
  if (brief.risk_review_status !== "clear" && brief.risk_review_status !== "approved") {
    return false;
  }
  if (brief.accepted_by_professional_id || brief.accepted_by_team_id) return false;
  // Direct-targeted briefs go to one named provider — never pool them.
  if (brief.routing_mode === "direct") return false;
  if (!brief.brief_template) return false;
  if (!brief.location) return false;
  return true;
}

// ─── Clustering (DB) ───────────────────────────────────────────────────────

export interface AssignToPoolResult {
  assigned: boolean;
  poolId?: number;
  reason?:
    | "flag_off"
    | "not_eligible"
    | "brief_not_found"
    | "already_member"
    | "pool_full"
    | "error";
}

/**
 * Clustering step: assign a (consenting) brief to the current period's pool
 * for its (template × state), creating the pool if absent. Respects max_size
 * — when the natural pool is full a fresh pool instance is opened by suffixing
 * the period (`2026-06#2`, `#3`, …) so demand still clusters rather than being
 * dropped. min_size below max is only a *display* threshold (a pool is shown
 * to advisers regardless; the member count is always honest).
 *
 * Flag-gated + fail-soft: returns `{ assigned:false }` (never throws) when the
 * flag is off, the brief isn't pool-eligible, the consumer didn't opt in, or
 * the tables are unavailable. Always called fire-and-forget by the brief
 * create/approve hooks — exactly where standing-orders hooks in.
 */
export async function assignBriefToPool(briefId: number): Promise<AssignToPoolResult> {
  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "user" });
  if (!enabled) return { assigned: false, reason: "flag_off" };

  try {
    const admin = createAdminClient();

    const { data: briefData, error: briefErr } = await admin
      .from("advisor_auctions")
      .select("*")
      .eq("id", briefId)
      .maybeSingle();
    if (briefErr) {
      log.warn("assignBriefToPool brief read failed", { briefId, err: briefErr.message });
      return { assigned: false, reason: "error" };
    }
    if (!briefData) return { assigned: false, reason: "brief_not_found" };

    const brief = briefData as unknown as BriefRow;
    if (!isBriefPoolEligible(brief)) return { assigned: false, reason: "not_eligible" };

    // Opt-in is recorded on the brief payload (pool_opt_in: true). Anything
    // else (anonymous, didn't tick the box) is a clean skip.
    const payload = (brief.brief_payload ?? {}) as Record<string, unknown>;
    if (payload.pool_opt_in !== true) return { assigned: false, reason: "not_eligible" };

    // Already assigned? brief_id is globally UNIQUE — a no-op re-run (e.g.
    // approve after create) must not double-insert or move the brief.
    const { data: existing } = await admin
      .from("pool_members")
      .select("id, pool_id")
      .eq("brief_id", briefId)
      .maybeSingle();
    if (existing) {
      return { assigned: false, reason: "already_member", poolId: existing.pool_id as number };
    }

    const templateKey = brief.brief_template as string;
    const state = brief.location as string;
    const basePeriod = periodForDate();

    // Find (or create) a non-full, non-terminal pool for this cluster, trying
    // base period then overflow suffixes. Bounded to avoid an unbounded loop.
    const MAX_OVERFLOW = 25;
    for (let instance = 1; instance <= MAX_OVERFLOW; instance += 1) {
      const period = instance === 1 ? basePeriod : `${basePeriod}#${instance}`;
      const pool = await getOrCreatePool(templateKey, state, period);
      if (!pool) return { assigned: false, reason: "error" };
      if (pool.status === "closed" || pool.status === "expired") continue;

      const { count } = await admin
        .from("pool_members")
        .select("id", { count: "exact", head: true })
        .eq("pool_id", pool.id)
        .neq("status", "left");
      if ((count ?? 0) >= pool.max_size) continue; // overflow → next instance

      const { error: insErr } = await admin.from("pool_members").insert({
        pool_id: pool.id,
        brief_id: briefId,
        consumer_email: (brief.contact_email ?? "").toLowerCase().trim(),
        status: "joined",
      });
      if (insErr) {
        // Unique-violation race (brief assigned concurrently) → treat as done.
        if (insErr.code === "23505") {
          return { assigned: false, reason: "already_member" };
        }
        log.warn("pool_members insert failed", { briefId, err: insErr.message });
        return { assigned: false, reason: "error" };
      }

      await admin.from("brief_tracker_events").insert({
        brief_id: briefId,
        event_type: "pool_joined",
        actor_kind: "system",
        actor_id: `demand_pool:${pool.id}`,
        payload: { pool_id: pool.id, template_key: templateKey, state, period },
      });

      log.info("brief joined demand pool", { briefId, poolId: pool.id, period });
      return { assigned: true, poolId: pool.id };
    }

    return { assigned: false, reason: "pool_full" };
  } catch (err) {
    log.warn("assignBriefToPool threw", {
      briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { assigned: false, reason: "error" };
  }
}

/**
 * Upsert-by-unique helper. Tries to read the pool; inserts it if missing.
 * Handles the insert race (unique violation) by re-reading. Returns null only
 * on a true error.
 */
async function getOrCreatePool(
  templateKey: string,
  state: string,
  period: string,
): Promise<DemandPoolRow | null> {
  const admin = createAdminClient();
  const { data: found } = await admin
    .from("demand_pools")
    .select("*")
    .eq("template_key", templateKey)
    .eq("state", state)
    .eq("period", period)
    .maybeSingle();
  if (found) return found as unknown as DemandPoolRow;

  const { data: created, error } = await admin
    .from("demand_pools")
    .insert({ template_key: templateKey, state, period })
    .select("*")
    .single();
  if (created) return created as unknown as DemandPoolRow;

  if (error?.code === "23505") {
    // Concurrent create — re-read.
    const { data: reread } = await admin
      .from("demand_pools")
      .select("*")
      .eq("template_key", templateKey)
      .eq("state", state)
      .eq("period", period)
      .maybeSingle();
    if (reread) return reread as unknown as DemandPoolRow;
  }
  log.warn("getOrCreatePool failed", { templateKey, state, period, err: error?.message });
  return null;
}

/**
 * Lazily flip a pool to 'expired' if its period has elapsed. Returns the
 * effective status. No-op (and returns current status) when not yet due.
 */
export async function markPoolExpiredIfDue(pool: DemandPoolRow): Promise<PoolStatus> {
  if (!isPoolExpiredForRead(pool) || pool.status === "expired") return pool.status;
  try {
    const admin = createAdminClient();
    await admin
      .from("demand_pools")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", pool.id)
      .neq("status", "expired");
    // Withdraw still-active offers so members stop seeing live offers on an
    // expired pool (best-effort; lazy).
    await admin
      .from("pool_offers")
      .update({ status: "expired" })
      .eq("pool_id", pool.id)
      .eq("status", "active");
  } catch (err) {
    log.warn("markPoolExpiredIfDue failed", {
      poolId: pool.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
  return "expired";
}

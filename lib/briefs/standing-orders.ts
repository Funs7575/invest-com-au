/**
 * Standing orders — adviser-defined auto-accept rules for the brief
 * marketplace ("Instant Match").
 *
 * An adviser saves a rule: which brief templates / states / budget bands
 * they want, the max credits they'll pay per accept, and a weekly cap.
 * When a brief becomes acceptable (created clear, or approved out of risk
 * review), `runStandingOrdersForBrief` claims it for the best candidate
 * via the existing `acceptBrief()` money path — same optimistic lock,
 * same ledger debit, same rollback semantics as a manual accept.
 *
 * Safety model (all enforced here, in one place):
 *   - `standing_orders` feature flag — absent/disabled ⇒ engine is a
 *     no-op (fail-closed kill switch, flippable in /admin/feature-flags).
 *   - Visibility parity — a rule can never accept a brief its owner could
 *     not see in their inbox (shared `isBriefVisibleToProvider`).
 *   - Per-rule rolling 7-day cap (`weekly_accept_cap`).
 *   - Per-adviser rolling 24h safety cap (DAILY_SAFETY_CAP) across all
 *     their rules.
 *   - Adviser-level gates: status='active', accepts_new_clients,
 *     accepts_briefs — same gates as the notification fan-out.
 *   - Fairness — candidates are tried least-recently-triggered first, so
 *     one adviser cannot monopolise the queue.
 *
 * Charging: `acceptBrief` handles affordability (insufficient balance ⇒
 * skip to next candidate) and tier semantics (success_only pros pay at
 * outcome time, exactly as with manual accepts).
 */

// eslint-disable-next-line no-restricted-imports -- engine runs server-side with no JWT (brief-creation hook + cron) and cross-references standing orders, professionals and team memberships across users; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";
import { acceptBrief } from "./credits";
import { isBriefVisibleToProvider } from "./eligibility";
import { notifyConsumerOfAcceptance } from "./notify";
import { sendProviderStandingOrderAccepted } from "@/lib/marketplace-emails";

import type { BriefRow } from "./types";

const log = logger("briefs:standing-orders");

export const STANDING_ORDERS_FLAG = "standing_orders";
/** Hard per-adviser cap on auto-accepts in any rolling 24h window. */
export const DAILY_SAFETY_CAP = 10;
/** Max standing orders a single adviser may keep (app-level guard). */
export const MAX_ORDERS_PER_ADVISOR = 5;

export interface StandingOrderRow {
  id: number;
  professional_id: number;
  status: "active" | "paused";
  paused_until: string | null;
  brief_templates: string[];
  states: string[];
  budget_bands: string[];
  max_credits_per_accept: number;
  weekly_accept_cap: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Pure helpers (unit-tested without a DB) ─────────────────────────────

/** Is the rule currently live (active, or paused with an elapsed timer)? */
export function isOrderLive(order: StandingOrderRow, now: Date = new Date()): boolean {
  if (order.status === "active") return true;
  if (order.status === "paused" && order.paused_until) {
    return new Date(order.paused_until) <= now;
  }
  return false;
}

/** Does the brief fall inside the rule's filters and credit ceiling? */
export function briefMatchesOrder(brief: BriefRow, order: StandingOrderRow): boolean {
  const cost = brief.accept_credits_cost ?? 2;
  if (cost > order.max_credits_per_accept) return false;
  if (
    order.brief_templates.length > 0 &&
    (!brief.brief_template || !order.brief_templates.includes(brief.brief_template))
  ) {
    return false;
  }
  if (
    order.states.length > 0 &&
    (!brief.location || !order.states.includes(brief.location))
  ) {
    return false;
  }
  if (
    order.budget_bands.length > 0 &&
    (!brief.budget_band || !order.budget_bands.includes(brief.budget_band))
  ) {
    return false;
  }
  return true;
}

/**
 * Fairness ordering: least-recently-triggered first (never-triggered rules
 * lead), oldest rule breaking ties — a simple rotation so no adviser can
 * camp the front of the queue.
 */
export function orderCandidates(orders: StandingOrderRow[]): StandingOrderRow[] {
  return [...orders].sort((a, b) => {
    const at = a.last_triggered_at ? new Date(a.last_triggered_at).getTime() : 0;
    const bt = b.last_triggered_at ? new Date(b.last_triggered_at).getTime() : 0;
    if (at !== bt) return at - bt;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

// ─── Engine ──────────────────────────────────────────────────────────────

export interface RunStandingOrdersResult {
  executed: boolean;
  accepted: boolean;
  professionalId?: number;
  standingOrderId?: number;
  reason?: string;
}

interface CandidateContext {
  order: StandingOrderRow;
  advisorType: string | null;
  firmId: number | null;
  teamIds: number[];
}

export async function runStandingOrdersForBrief(
  briefId: number,
  opts: { excludeProfessionalId?: number | null } = {},
): Promise<RunStandingOrdersResult> {
  const enabled = await isFlagEnabled(STANDING_ORDERS_FLAG, { segment: "advisor" });
  if (!enabled) return { executed: false, accepted: false, reason: "flag_off" };

  const admin = createAdminClient();

  // ── 1. Brief must be acceptable right now ─────────────────────────
  const { data: briefData } = await admin
    .from("advisor_auctions")
    .select("*")
    .eq("id", briefId)
    .maybeSingle();
  if (!briefData) return { executed: true, accepted: false, reason: "brief_not_found" };

  const brief = briefData as unknown as BriefRow;
  if (
    brief.flow_type !== "accept" ||
    brief.status !== "open" ||
    (brief.risk_review_status !== "clear" && brief.risk_review_status !== "approved") ||
    brief.accepted_by_professional_id ||
    brief.accepted_by_team_id
  ) {
    return { executed: true, accepted: false, reason: "brief_not_acceptable" };
  }

  // ── 2. Load live rules and pure-filter against the brief ──────────
  const { data: orderRows, error: ordersError } = await admin
    .from("advisor_standing_orders")
    .select("*")
    .eq("status", "active");
  if (ordersError) {
    // Table missing (migration pending) or unreachable — degrade to no-op.
    log.warn("standing orders read failed", { err: ordersError.message });
    return { executed: false, accepted: false, reason: "orders_unavailable" };
  }

  const now = new Date();
  const matching = ((orderRows ?? []) as unknown as StandingOrderRow[]).filter(
    (o) =>
      isOrderLive(o, now) &&
      o.professional_id !== (opts.excludeProfessionalId ?? -1) &&
      briefMatchesOrder(brief, o),
  );
  if (matching.length === 0) {
    return { executed: true, accepted: false, reason: "no_matching_orders" };
  }

  // ── 3. Hydrate adviser context (gates + visibility inputs) ────────
  const professionalIds = Array.from(new Set(matching.map((o) => o.professional_id)));
  const { data: pros } = await admin
    .from("professionals")
    .select("id, type, firm_id, status, accepts_new_clients, accepts_briefs")
    .in("id", professionalIds)
    .eq("status", "active");
  const proById = new Map(
    (pros ?? []).map((p) => [p.id as number, p as Record<string, unknown>]),
  );

  const { data: memberships } = await admin
    .from("expert_team_members")
    .select("team_id, professional_id")
    .in("professional_id", professionalIds)
    .eq("status", "active");
  const teamIdsByPro = new Map<number, number[]>();
  for (const m of memberships ?? []) {
    const pid = m.professional_id as number;
    const list = teamIdsByPro.get(pid) ?? [];
    list.push(m.team_id as number);
    teamIdsByPro.set(pid, list);
  }

  const candidates: CandidateContext[] = [];
  for (const order of orderCandidates(matching)) {
    const pro = proById.get(order.professional_id);
    if (!pro) continue; // inactive or missing
    if (pro.accepts_new_clients === false || pro.accepts_briefs === false) continue;
    const ctx: CandidateContext = {
      order,
      advisorType: (pro.type as string | null) ?? null,
      firmId: (pro.firm_id as number | null) ?? null,
      teamIds: teamIdsByPro.get(order.professional_id) ?? [],
    };
    if (
      !isBriefVisibleToProvider(brief, {
        professionalId: order.professional_id,
        advisorType: ctx.advisorType,
        firmId: ctx.firmId,
        teamIds: ctx.teamIds,
      })
    ) {
      continue;
    }
    candidates.push(ctx);
  }
  if (candidates.length === 0) {
    return { executed: true, accepted: false, reason: "no_eligible_candidates" };
  }

  // ── 4. Cap checks need recent run counts ───────────────────────────
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRuns } = await admin
    .from("advisor_standing_order_runs")
    .select("standing_order_id, professional_id, created_at, accepted")
    .in("professional_id", professionalIds)
    .eq("accepted", true)
    .gte("created_at", since7d);
  const weeklyByOrder = new Map<number, number>();
  const dailyByPro = new Map<number, number>();
  const since24h = now.getTime() - 24 * 60 * 60 * 1000;
  for (const r of recentRuns ?? []) {
    const oid = r.standing_order_id as number | null;
    if (oid !== null) weeklyByOrder.set(oid, (weeklyByOrder.get(oid) ?? 0) + 1);
    if (new Date(r.created_at as string).getTime() >= since24h) {
      const pid = r.professional_id as number;
      dailyByPro.set(pid, (dailyByPro.get(pid) ?? 0) + 1);
    }
  }

  // ── 5. Try candidates in fairness order ────────────────────────────
  for (const { order } of candidates) {
    if ((weeklyByOrder.get(order.id) ?? 0) >= order.weekly_accept_cap) {
      continue; // silent skip — cap reached, no run row (not an attempt)
    }
    if ((dailyByPro.get(order.professional_id) ?? 0) >= DAILY_SAFETY_CAP) {
      continue;
    }

    const result = await acceptBrief({
      briefId,
      professionalId: order.professional_id,
    });

    if (result.accepted) {
      const credits = result.creditsSpent;
      await admin.from("advisor_standing_order_runs").insert({
        standing_order_id: order.id,
        professional_id: order.professional_id,
        brief_id: briefId,
        accepted: true,
        reason: "accepted",
        credits_spent: credits,
      });
      await admin
        .from("advisor_standing_orders")
        .update({ last_triggered_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", order.id);
      await admin.from("brief_tracker_events").insert({
        brief_id: briefId,
        event_type: "standing_order_accept",
        actor_kind: "system",
        actor_id: `standing_order:${order.id}`,
        payload: { professional_id: order.professional_id, credits },
      });

      // Notifications — fire-and-forget, never block the engine.
      if (brief.contact_email) {
        void notifyConsumerOfAcceptance({
          consumerEmail: brief.contact_email,
          consumerName: brief.contact_name ?? "",
          briefTitle: brief.job_title || "Your Match Request",
          briefSlug: brief.slug,
          briefId,
          professionalId: order.professional_id,
          teamId: null,
        }).catch((err) => {
          log.warn("auto-accept consumer notify failed", {
            briefId,
            err: err instanceof Error ? err.message : String(err),
          });
        });
      }
      void notifyAdvisorOfAutoAccept(order, brief, credits).catch((err) => {
        log.warn("auto-accept advisor notify failed", {
          briefId,
          err: err instanceof Error ? err.message : String(err),
        });
      });

      log.info("standing order accepted brief", {
        briefId,
        standingOrderId: order.id,
        professionalId: order.professional_id,
        credits,
      });
      return {
        executed: true,
        accepted: true,
        professionalId: order.professional_id,
        standingOrderId: order.id,
      };
    }

    if (result.reason === "already_accepted") {
      // Someone (manual or another path) beat us to it — stop entirely.
      return { executed: true, accepted: false, reason: "already_accepted" };
    }
    if (result.reason === "not_acceptable" || result.reason === "risk_held" || result.reason === "brief_not_found") {
      // Brief-level state — no point trying other candidates.
      return { executed: true, accepted: false, reason: result.reason };
    }
    if (result.reason === "insufficient_credits") {
      await admin.from("advisor_standing_order_runs").insert({
        standing_order_id: order.id,
        professional_id: order.professional_id,
        brief_id: briefId,
        accepted: false,
        reason: "insufficient_credits",
        credits_spent: 0,
      });
      continue; // next candidate
    }
  }

  return { executed: true, accepted: false, reason: "no_candidate_accepted" };
}

async function notifyAdvisorOfAutoAccept(
  order: StandingOrderRow,
  brief: BriefRow,
  creditsSpent: number,
): Promise<void> {
  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("name, email")
    .eq("id", order.professional_id)
    .maybeSingle();
  if (!pro?.email || typeof pro.email !== "string") return;
  await sendProviderStandingOrderAccepted({
    providerEmail: pro.email,
    providerName: (pro.name as string) || "Pro",
    briefTitle: brief.job_title || "Match Request",
    briefSlug: brief.slug,
    briefId: brief.id,
    creditsSpent,
    briefBudgetBand: brief.budget_band,
    briefLocation: brief.location,
  });
}

/**
 * Safety-net sweep for the cron: standing orders are normally triggered
 * inline when a brief is created/approved, but a crash between insert and
 * hook (or an order created after the brief) would otherwise miss the
 * brief forever. Sweeps recent open briefs through the engine.
 */
export async function sweepStandingOrders(): Promise<{
  scanned: number;
  accepted: number;
}> {
  const enabled = await isFlagEnabled(STANDING_ORDERS_FLAG, { segment: "advisor" });
  if (!enabled) return { scanned: 0, accepted: 0 };

  const admin = createAdminClient();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: briefs } = await admin
    .from("advisor_auctions")
    .select("id")
    .eq("flow_type", "accept")
    .eq("status", "open")
    .in("risk_review_status", ["clear", "approved"])
    .is("accepted_by_professional_id", null)
    .is("accepted_by_team_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(50);

  let accepted = 0;
  for (const b of briefs ?? []) {
    try {
      const result = await runStandingOrdersForBrief(b.id as number);
      if (result.accepted) accepted += 1;
    } catch (err) {
      log.warn("sweep run failed", {
        briefId: b.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { scanned: (briefs ?? []).length, accepted };
}

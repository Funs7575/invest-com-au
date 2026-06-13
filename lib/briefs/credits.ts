/**
 * Brief credit accept-and-unlock flow.
 *
 * One "credit" in the brief marketplace = A$1.00. The existing
 * `professionals.credit_balance_cents` cache and `advisor_credit_ledger`
 * remain the source of truth — `acceptBrief` records a negative
 * `lead_spend` entry of `credits * CENTS_PER_CREDIT` and atomically
 * flips the `advisor_auctions` row to `accepted_by_*` + `accepted_at`.
 *
 * If the row is already accepted (another provider got there first),
 * the ledger entry is not recorded and the caller receives a
 * `{ accepted: false, reason: 'already_accepted' }` result so the UI
 * can show "another provider already accepted this brief".
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate per CLAUDE.md: brief-accept mutates accepted_by_* columns + ledger writes; happens on the provider's behalf with cross-row checks (brief eligibility) that anon-role can't see.
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";
import { logger } from "@/lib/logger";
import { getProPricingTier } from "./pricing-tier";

import type { BriefRow, ProviderKind } from "./types";

const log = logger("briefs:credits");

export const CENTS_PER_CREDIT = 100;

export interface AcceptCostQuery {
  briefTemplate: string;
  providerKind: ProviderKind;
}

/**
 * Resolve the credit cost for a brief template + provider kind.
 *
 * Priority: exact (template, providerKind) match → (template, 'any') →
 * generic ('general', 'any') → fallback constant.
 */
export async function getAcceptCost({
  briefTemplate,
  providerKind,
}: AcceptCostQuery): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("brief_credit_prices")
      .select("brief_template, provider_type, credits_cost")
      .in("brief_template", [briefTemplate, "general"])
      .in("provider_type", [providerKind, "any"]);
    if (error) throw error;

    const rows = (data ?? []) as {
      brief_template: string;
      provider_type: string;
      credits_cost: number;
    }[];

    const exact = rows.find(
      (r) => r.brief_template === briefTemplate && r.provider_type === providerKind,
    );
    if (exact) return exact.credits_cost;

    const tmplAny = rows.find(
      (r) => r.brief_template === briefTemplate && r.provider_type === "any",
    );
    if (tmplAny) return tmplAny.credits_cost;

    const genericAny = rows.find(
      (r) => r.brief_template === "general" && r.provider_type === "any",
    );
    if (genericAny) return genericAny.credits_cost;
  } catch (err) {
    // Pricing table not ready (migration pending) or unreachable. Fall back
    // to the constant so the result screen still renders a sensible cost.
    log.warn("getAcceptCost failed (using fallback constant)", {
      briefTemplate,
      providerKind,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return 2;
}

/**
 * Pre-charge affordability gate, shared by `acceptBrief` (direct accept) and
 * `acceptReferral` (accept via a team referral) so the two paths can never
 * diverge on the money rules. Resolves the pro's pricing tier and, for the
 * `standard` tier, checks the cached `credit_balance_cents` against the
 * accept-time charge.
 *
 * Returns the data the caller needs to either (a) abort BEFORE claiming the
 * brief when funds are short, or (b) decide whether to record the accept-time
 * charge at all (success_only pros pay nothing at accept).
 *
 * NB: like `acceptBrief`, this gates on the cached balance — the authoritative
 * floor is `recordLedgerEntry`, which rejects spend entries that would drive
 * `credit_balance_cents` below zero.
 */
export interface ProChargeGate {
  /** The pro's pricing tier at the moment of the check. */
  tier: import("./pricing-tier").PricingTier;
  /** Accept-time charge in cents (0 for success_only). */
  chargeCents: number;
  /** Whether the pro can afford `chargeCents`. Always true for success_only. */
  sufficient: boolean;
  /** Cached balance read for the check (cents). */
  currentBalanceCents: number;
}

export async function resolveProChargeGate(
  professionalId: number,
  credits: number,
): Promise<ProChargeGate> {
  const admin = createAdminClient();
  const cents = credits * CENTS_PER_CREDIT;

  // success_only pros pay nothing at accept (they settle at outcome-submit).
  const tier = await getProPricingTier(professionalId);

  const { data: pro } = await admin
    .from("professionals")
    .select("credit_balance_cents")
    .eq("id", professionalId)
    .maybeSingle();
  const currentBalanceCents = pro?.credit_balance_cents ?? 0;

  if (tier !== "standard") {
    // No accept-time charge — nothing to gate on.
    return { tier, chargeCents: 0, sufficient: true, currentBalanceCents };
  }

  return {
    tier,
    chargeCents: cents,
    sufficient: currentBalanceCents >= cents,
    currentBalanceCents,
  };
}

export interface AcceptBriefInput {
  briefId: number;
  professionalId: number;
  teamId?: number | null;
  /**
   * Override the credits charged for this accept, replacing the brief's
   * `accept_credits_cost`. Used by Group Briefs to charge a volume-discounted
   * cost while reusing this exact money path (same affordability gate, same
   * `recordLedgerEntry` debit, same rollback, same tracker event). When
   * omitted, the brief's own cost is used — every existing caller is
   * unaffected. Clamped to >= 0.
   */
  costOverride?: number | null;
}

export type AcceptBriefResult =
  | {
      accepted: true;
      brief: BriefRow;
      creditsSpent: number;
      balanceAfterCents: number;
    }
  | {
      accepted: false;
      reason:
        | "already_accepted"
        | "not_acceptable"
        | "insufficient_credits"
        | "brief_not_found"
        | "risk_held";
      balanceAfterCents?: number;
    };

export async function acceptBrief({
  briefId,
  professionalId,
  teamId,
  costOverride,
}: AcceptBriefInput): Promise<AcceptBriefResult> {
  const admin = createAdminClient();

  // ── 1. Load brief + check it is in accept flow + not already taken ─
  const { data: brief } = await admin
    .from("advisor_auctions")
    .select("*")
    .eq("id", briefId)
    .maybeSingle();

  if (!brief) {
    return { accepted: false, reason: "brief_not_found" };
  }

  const row = brief as unknown as BriefRow;

  if (row.flow_type !== "accept") {
    return { accepted: false, reason: "not_acceptable" };
  }
  if (row.status !== "open") {
    return { accepted: false, reason: "not_acceptable" };
  }
  if (row.risk_review_status !== "clear" && row.risk_review_status !== "approved") {
    return { accepted: false, reason: "risk_held" };
  }
  if (row.accepted_by_professional_id || row.accepted_by_team_id) {
    return { accepted: false, reason: "already_accepted" };
  }

  // Credits charged: an explicit override (Group Briefs volume discount) wins
  // over the brief's own cost. Clamped to >= 0 so a bad override can never
  // produce a positive (crediting) ledger entry.
  const credits =
    costOverride !== undefined && costOverride !== null
      ? Math.max(0, Math.round(costOverride))
      : row.accept_credits_cost ?? 2;
  const cents = credits * CENTS_PER_CREDIT;

  // ── 2. Pre-charge gate: resolve pricing tier (success_only pros skip the
  //      accept-time charge) and, for standard tier, check sufficient balance
  //      up front. Shared with the referral-accept path via resolveProChargeGate.
  const gate = await resolveProChargeGate(professionalId, credits);
  const tier = gate.tier;
  const currentBalance = gate.currentBalanceCents;
  if (!gate.sufficient) {
    return {
      accepted: false,
      reason: "insufficient_credits",
      balanceAfterCents: currentBalance,
    };
  }

  // ── 3. Optimistic-lock claim on the brief row ──────────────────────
  const acceptedAt = new Date().toISOString();
  const updates: Record<string, unknown> = {
    accepted_by_professional_id: professionalId,
    accepted_at: acceptedAt,
    tracker_status: "new",
    pricing_tier_at_accept: tier,
  };
  if (teamId) updates.accepted_by_team_id = teamId;

  const { data: claimed } = await admin
    .from("advisor_auctions")
    .update(updates)
    .eq("id", briefId)
    .is("accepted_by_professional_id", null)
    .is("accepted_by_team_id", null)
    .select("*")
    .maybeSingle();

  if (!claimed) {
    return { accepted: false, reason: "already_accepted" };
  }

  // ── 4. Debit credits via ledger (idempotent on brief_id) ───────────
  //      Skipped entirely when the pro is on the success_only tier — those
  //      pros pay at outcome-submit time instead, gated on outcome=completed.
  let balanceAfterCents = currentBalance;
  if (tier === "standard") {
  try {
    const result = await recordLedgerEntry({
      professionalId,
      amountCents: -cents,
      kind: "lead_spend",
      description: `Brief #${briefId} accept`,
      referenceType: "brief_accept",
      referenceId: String(briefId),
      metadata: { team_id: teamId ?? null, credits },
    });
    balanceAfterCents = result.balanceAfterCents;
  } catch (err) {
    // Roll back the claim to keep things consistent.
    await admin
      .from("advisor_auctions")
      .update({
        accepted_by_professional_id: null,
        accepted_by_team_id: null,
        accepted_at: null,
        tracker_status: "new",
        pricing_tier_at_accept: null,
      })
      .eq("id", briefId);
    log.error("acceptBrief: ledger debit failed", {
      briefId,
      professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
  } // end if (tier === "standard")

  // ── 5. Emit tracker event ───────────────────────────────────────────
  await admin.from("brief_tracker_events").insert({
    brief_id: briefId,
    event_type: "accepted",
    actor_kind: "professional",
    actor_id: String(professionalId),
    payload: {
      credits,
      team_id: teamId ?? null,
      pricing_tier: tier,
      charged_at_accept: tier === "standard",
    },
  });

  // ── 5. Auto-recharge trigger (fire-and-forget) ────────────────────
  // If the provider has auto-recharge enabled and the balance has now
  // dropped below their threshold, kick off an off-session Stripe
  // payment. The credit grant lands via the existing webhook path
  // (checkout.session.completed → recordLedgerEntry). Failures are
  // swallowed so the brief acceptance always succeeds.
  void import("./auto-recharge").then(({ maybeAutoRecharge }) => {
    void maybeAutoRecharge(professionalId);
  });

  return {
    accepted: true,
    brief: claimed as unknown as BriefRow,
    creditsSpent: credits,
    balanceAfterCents,
  };
}

export interface UpdateTrackerStatusInput {
  briefId: number;
  professionalId: number;
  newStatus:
    | "new"
    | "contacted"
    | "call_booked"
    | "proposal_sent"
    | "won"
    | "lost";
  note?: string;
}

export async function updateTrackerStatus({
  briefId,
  professionalId,
  newStatus,
  note,
}: UpdateTrackerStatusInput): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data: brief } = await admin
    .from("advisor_auctions")
    .select("id, accepted_by_professional_id, tracker_status")
    .eq("id", briefId)
    .maybeSingle();
  if (!brief) return { ok: false, reason: "brief_not_found" };
  if (brief.accepted_by_professional_id !== professionalId) {
    return { ok: false, reason: "not_owner" };
  }
  await admin
    .from("advisor_auctions")
    .update({ tracker_status: newStatus })
    .eq("id", briefId);
  await admin.from("brief_tracker_events").insert({
    brief_id: briefId,
    event_type: "status_changed",
    actor_kind: "professional",
    actor_id: String(professionalId),
    payload: { from: brief.tracker_status, to: newStatus, note: note ?? null },
  });
  return { ok: true };
}

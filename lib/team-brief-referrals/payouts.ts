/**
 * Referral payouts — when one squad refers an out-of-scope brief to another
 * squad and the receiving squad accepts, two credit movements happen:
 *
 *   1. The accepting professional is debited the brief's accept_credits_cost
 *      — exactly mirroring the direct-accept path (`acceptBrief`). This means
 *      the charge is gated on the pro's pricing tier: `standard` pros pay the
 *      accept-time charge now; `success_only` pros pay $0 at accept (they
 *      settle at outcome-submit time) so we skip the debit entirely for them.
 *      The sufficient-balance check happens in the caller (`acceptReferral`)
 *      BEFORE the brief is claimed; `recordLedgerEntry` additionally enforces
 *      a hard negative-balance floor on `lead_spend`.
 *   2. The referring professional (or, if not set, the first active member
 *      of the from_team) is credited REFERRAL_PAYOUT_BPS / 10_000 of the
 *      standard charge — defaults to 20% (2_000 bps). Environment override:
 *      `REFERRAL_PAYOUT_BPS`. The referrer is paid per the agreed rule
 *      regardless of the accepting pro's tier.
 *
 * Both writes go through `recordLedgerEntry` so the existing idempotency
 * triple (kind, reference_type, reference_id) prevents double-charging on
 * retries. The referral row is then stamped with the audit trail.
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate: payout writes cross professional rows + the referrals table; happens on the squad's behalf with cross-row checks anon can't see.
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";
import { CENTS_PER_CREDIT } from "@/lib/briefs/credits";
import type { PricingTier } from "@/lib/briefs/pricing-tier";
import { logger } from "@/lib/logger";

const log = logger("referrals:payouts");

const DEFAULT_REFERRAL_PAYOUT_BPS = 2_000; // 20%

function getReferralPayoutBps(): number {
  const raw = process.env.REFERRAL_PAYOUT_BPS;
  if (!raw) return DEFAULT_REFERRAL_PAYOUT_BPS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000) {
    log.warn("REFERRAL_PAYOUT_BPS out of range, using default", { raw });
    return DEFAULT_REFERRAL_PAYOUT_BPS;
  }
  return parsed;
}

export interface RecordReferralPayoutInput {
  referralId: number;
  briefId: number;
  acceptCreditsCost: number;
  acceptingProfessionalId: number;
  /**
   * The person who clicked Refer on the from_team's inbox. If null, we fall
   * back to the first active member of from_team_id so the payout still
   * lands somewhere accountable.
   */
  fromProfessionalId: number | null;
  fromTeamId: number;
  /**
   * The accepting pro's pricing tier, resolved by the caller BEFORE the brief
   * is claimed. `success_only` pros pay $0 at accept (they settle at
   * outcome-submit time), so we skip the accept-time debit for them while
   * still paying out the referrer. Defaults to `"standard"` when omitted so
   * existing callers keep the prior behaviour.
   */
  pricingTier?: PricingTier;
}

export interface RecordReferralPayoutResult {
  /** Amount actually debited from the accepting pro (0 for success_only). */
  chargeCents: number;
  payoutCents: number;
  acceptingBalanceAfterCents: number;
  referrerBalanceAfterCents: number;
  payoutProfessionalId: number;
}

export async function recordReferralPayout(
  input: RecordReferralPayoutInput,
): Promise<RecordReferralPayoutResult> {
  const bps = getReferralPayoutBps();
  const tier: PricingTier = input.pricingTier ?? "standard";
  // The standard accept-time charge — used both for the (possibly skipped)
  // debit and as the basis for the referrer payout, which is paid per the
  // agreed rule regardless of the accepting pro's tier.
  const standardChargeCents = input.acceptCreditsCost * CENTS_PER_CREDIT;
  // success_only pros pay $0 at accept; standard pros pay the full charge.
  const debitCents = tier === "standard" ? standardChargeCents : 0;
  const payoutCents = Math.floor((standardChargeCents * bps) / 10_000);

  const admin = createAdminClient();

  // ── Resolve who gets the referral payout ──────────────────────────────
  let payoutProfessionalId = input.fromProfessionalId;
  if (!payoutProfessionalId) {
    const { data: member } = await admin
      .from("expert_team_members")
      .select("professional_id")
      .eq("team_id", input.fromTeamId)
      .eq("status", "active")
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    payoutProfessionalId = (member?.professional_id as number | undefined) ?? null;
  }
  if (!payoutProfessionalId) {
    throw new Error(
      `recordReferralPayout: no payout target for from_team_id=${input.fromTeamId}`,
    );
  }

  // ── Charge the accepting professional ─────────────────────────────────
  //     Skipped entirely for success_only pros (they settle at outcome-submit
  //     time), exactly like acceptBrief. recordLedgerEntry enforces the
  //     negative-balance floor on lead_spend, but the caller has already
  //     gated on sufficient balance before claiming the brief.
  let acceptingBalanceAfterCents: number;
  if (debitCents > 0) {
    const charge = await recordLedgerEntry({
      professionalId: input.acceptingProfessionalId,
      amountCents: -debitCents,
      kind: "lead_spend",
      description: `Brief #${input.briefId} accept via referral #${input.referralId}`,
      referenceType: "brief_accept",
      referenceId: String(input.briefId),
      metadata: {
        referral_id: input.referralId,
        via_referral: true,
        credits: input.acceptCreditsCost,
        pricing_tier_at_accept: tier,
      },
    });
    acceptingBalanceAfterCents = charge.balanceAfterCents;
  } else {
    // No accept-time charge — read the current balance for the result.
    const { data: pro } = await admin
      .from("professionals")
      .select("credit_balance_cents")
      .eq("id", input.acceptingProfessionalId)
      .maybeSingle();
    acceptingBalanceAfterCents = pro?.credit_balance_cents ?? 0;
  }

  // ── Pay out the referring professional (only when bps > 0) ────────────
  let referrerBalanceAfterCents = 0;
  if (payoutCents > 0) {
    const payout = await recordLedgerEntry({
      professionalId: payoutProfessionalId,
      amountCents: payoutCents,
      kind: "referral_payout",
      description: `Referral payout for brief #${input.briefId} (${bps / 100}%)`,
      referenceType: "referral_payout",
      referenceId: String(input.referralId),
      metadata: {
        referral_id: input.referralId,
        brief_id: input.briefId,
        bps,
      },
    });
    referrerBalanceAfterCents = payout.balanceAfterCents;
  } else {
    // Read current balance for the result so callers see something sensible.
    const { data: pro } = await admin
      .from("professionals")
      .select("credit_balance_cents")
      .eq("id", payoutProfessionalId)
      .maybeSingle();
    referrerBalanceAfterCents = pro?.credit_balance_cents ?? 0;
  }

  // ── Stamp the referral row with the audit trail ───────────────────────
  await admin
    .from("team_brief_referrals")
    .update({
      accept_credits_charged: input.acceptCreditsCost,
      referrer_credits_awarded: Math.floor(payoutCents / CENTS_PER_CREDIT),
      payout_recorded_at: new Date().toISOString(),
    })
    .eq("id", input.referralId);

  return {
    chargeCents: debitCents,
    payoutCents,
    acceptingBalanceAfterCents,
    referrerBalanceAfterCents,
    payoutProfessionalId,
  };
}

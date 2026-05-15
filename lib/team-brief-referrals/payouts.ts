/**
 * Referral payouts — when one squad refers an out-of-scope brief to another
 * squad and the receiving squad accepts, two credit movements happen:
 *
 *   1. The accepting professional is debited the brief's accept_credits_cost
 *      (same charge they'd pay accepting directly).
 *   2. The referring professional (or, if not set, the first active member
 *      of the from_team) is credited REFERRAL_PAYOUT_BPS / 10_000 of the
 *      charge — defaults to 20% (2_000 bps). Environment override:
 *      `REFERRAL_PAYOUT_BPS`.
 *
 * Both writes go through `recordLedgerEntry` so the existing idempotency
 * triple (kind, reference_type, reference_id) prevents double-charging on
 * retries. The referral row is then stamped with the audit trail.
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate: payout writes cross professional rows + the referrals table; happens on the squad's behalf with cross-row checks anon can't see.
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";
import { CENTS_PER_CREDIT } from "@/lib/briefs/credits";
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
}

export interface RecordReferralPayoutResult {
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
  const chargeCents = input.acceptCreditsCost * CENTS_PER_CREDIT;
  const payoutCents = Math.floor((chargeCents * bps) / 10_000);

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
  const charge = await recordLedgerEntry({
    professionalId: input.acceptingProfessionalId,
    amountCents: -chargeCents,
    kind: "lead_spend",
    description: `Brief #${input.briefId} accept via referral #${input.referralId}`,
    referenceType: "brief_accept",
    referenceId: String(input.briefId),
    metadata: {
      referral_id: input.referralId,
      via_referral: true,
      credits: input.acceptCreditsCost,
    },
  });

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
    chargeCents,
    payoutCents,
    acceptingBalanceAfterCents: charge.balanceAfterCents,
    referrerBalanceAfterCents,
    payoutProfessionalId,
  };
}

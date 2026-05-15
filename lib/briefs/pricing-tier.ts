/**
 * Outcome-based pricing tier helpers.
 *
 * Two tiers:
 *   - `standard`     — Pay credits at brief-accept time. Existing behaviour.
 *   - `success_only` — Pay nothing at accept. Pay SUCCESS_PRICING_MULTIPLIER_BPS
 *                      of the standard cost at outcome-submit time, but only
 *                      when the consumer marks outcome = 'completed'. The
 *                      payment is recorded with ledger kind
 *                      `success_bonus_award` (a negative-amount entry on the
 *                      pro's balance via `recordLedgerEntry`).
 *
 * Default multiplier: 1.5x standard (15_000 bps). Env override:
 * `SUCCESS_PRICING_MULTIPLIER_BPS`.
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate: cross-row reads against advisor_auctions + professionals where API caller's JWT may not be available (cron-driven outcome settlement).
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";

// Inlined to avoid a circular import with ./credits.ts (which now imports
// getProPricingTier from this module).
const CENTS_PER_CREDIT = 100;
import { logger } from "@/lib/logger";

const log = logger("briefs:pricing-tier");

export type PricingTier = "standard" | "success_only";

const DEFAULT_SUCCESS_MULTIPLIER_BPS = 15_000; // 1.5x

export function getSuccessPricingMultiplierBps(): number {
  const raw = process.env.SUCCESS_PRICING_MULTIPLIER_BPS;
  if (!raw) return DEFAULT_SUCCESS_MULTIPLIER_BPS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 10_000 || parsed > 50_000) {
    log.warn("SUCCESS_PRICING_MULTIPLIER_BPS out of range, using default", { raw });
    return DEFAULT_SUCCESS_MULTIPLIER_BPS;
  }
  return parsed;
}

/**
 * Compute the success-tier charge for a given standard credit cost.
 * Returns cents.
 */
export function successChargeCents(standardCredits: number): number {
  const baseCents = standardCredits * CENTS_PER_CREDIT;
  const bps = getSuccessPricingMultiplierBps();
  return Math.floor((baseCents * bps) / 10_000);
}

/**
 * Look up a pro's current pricing tier. Returns 'standard' on any error so
 * brief acceptance keeps working in the worst case.
 */
export async function getProPricingTier(
  professionalId: number,
): Promise<PricingTier> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("professionals")
      .select("pricing_tier")
      .eq("id", professionalId)
      .maybeSingle();
    const tier = data?.pricing_tier as PricingTier | undefined;
    return tier === "success_only" ? "success_only" : "standard";
  } catch (err) {
    log.warn("getProPricingTier read failed", {
      professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return "standard";
  }
}

export interface SettleSuccessChargeInput {
  briefId: number;
  professionalId: number;
  standardCredits: number;
}

export interface SettleSuccessChargeResult {
  charged: boolean;
  reason?:
    | "not_success_tier"
    | "already_settled"
    | "ledger_error";
  amountCents: number;
}

/**
 * Settle the success-tier charge once a consumer marks the brief outcome as
 * 'completed'. Idempotent via the ledger's (kind, reference_type,
 * reference_id) triple — repeated calls return `charged: false` with reason
 * `already_settled`.
 *
 * Caller (the outcomes/submit route) should call this only when the consumer
 * sets `outcome='completed'`. We additionally guard on the snapshot tier so a
 * later tier change on the pro doesn't retroactively re-bill.
 */
export async function settleSuccessCharge(
  input: SettleSuccessChargeInput,
): Promise<SettleSuccessChargeResult> {
  const admin = createAdminClient();
  const { data: brief } = await admin
    .from("advisor_auctions")
    .select("id, pricing_tier_at_accept")
    .eq("id", input.briefId)
    .maybeSingle();
  if (!brief || brief.pricing_tier_at_accept !== "success_only") {
    return { charged: false, reason: "not_success_tier", amountCents: 0 };
  }

  const amountCents = successChargeCents(input.standardCredits);
  try {
    const result = await recordLedgerEntry({
      professionalId: input.professionalId,
      amountCents: -amountCents,
      kind: "success_bonus_award",
      description: `Success-tier charge for brief #${input.briefId}`,
      referenceType: "success_charge",
      referenceId: String(input.briefId),
      metadata: {
        standard_credits: input.standardCredits,
        bps: getSuccessPricingMultiplierBps(),
      },
    });
    if (result.idempotent) {
      return { charged: false, reason: "already_settled", amountCents };
    }
    return { charged: true, amountCents };
  } catch (err) {
    log.error("success charge settle failed", {
      briefId: input.briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { charged: false, reason: "ledger_error", amountCents };
  }
}

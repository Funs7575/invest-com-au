/**
 * Two-axis lead pricing helper (Phase 4.1).
 *
 * finalPrice = baseLeadPrice
 *              × advisor_specialties.lead_multiplier
 *              × firm_pricing_tiers.multiplier
 *
 * Axes are independent: a firm of 10 advisors where 1 does cross-border
 * doesn't have all 10 paying premium rates. The specialty multiplier
 * travels with the person; the firm tier applies across all the firm's
 * leads.
 *
 * Existing lib/advisor-billing.ts continues to read baseLeadPrice; this
 * helper is opt-in until that module is refactored (deferred per
 * master plan). Call sites that already know they want the new pricing
 * (e.g. cross-border CTA wiring) can import this directly.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("lead-pricing");

export interface PricingInputs {
  baseLeadPriceCents: number;
  specialtyMultiplier?: number | null;
  firmTierMultiplier?: number | null;
  /** Demand axis (Idea #3). Clamped to [0.8, 1.5] before applying. */
  demandMultiplier?: number | null;
}

/** Bounds on the demand axis so a bad signal can't produce runaway pricing. */
export const DEMAND_MULTIPLIER_MIN = 0.8;
export const DEMAND_MULTIPLIER_MAX = 1.5;

function clampDemand(m: number): number {
  return Math.min(DEMAND_MULTIPLIER_MAX, Math.max(DEMAND_MULTIPLIER_MIN, m));
}

/**
 * Pure helper — compose the three axes (specialty × firm-tier × demand).
 * NULL multipliers fall back to 1.0; the demand axis is additionally
 * clamped to [0.8, 1.5]. Returns cents (integer).
 */
export function composeLeadPrice(opts: PricingInputs): number {
  const specialty = opts.specialtyMultiplier ?? 1.0;
  const firm = opts.firmTierMultiplier ?? 1.0;
  const demand = opts.demandMultiplier != null ? clampDemand(opts.demandMultiplier) : 1.0;
  return Math.round(opts.baseLeadPriceCents * specialty * firm * demand);
}

/**
 * Look up the demand multiplier for a category from lead_demand_signals.
 * Returns 1.0 (no adjustment) when absent or on error.
 */
export async function resolveDemandMultiplier(category: string): Promise<number> {
  if (!category) return 1.0;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lead_demand_signals")
      .select("multiplier")
      .eq("category", category)
      .maybeSingle();
    if (error || data?.multiplier == null) return 1.0;
    return clampDemand(Number(data.multiplier));
  } catch (err) {
    log.warn("resolveDemandMultiplier threw", {
      category,
      err: err instanceof Error ? err.message : String(err),
    });
    return 1.0;
  }
}

/**
 * Resolve the multipliers for a (specialtyId, firmId) pair. Both
 * lookups are independent — failure on one falls back to 1.0 with a
 * warn log so the caller never gets a NaN.
 */
export async function resolvePricingMultipliers(opts: {
  specialtyId?: number | null;
  firmId?: number | null;
}): Promise<{ specialtyMultiplier: number; firmTierMultiplier: number }> {
  const supabase = createAdminClient();
  let specialtyMultiplier = 1.0;
  let firmTierMultiplier = 1.0;

  if (opts.specialtyId) {
    try {
      const { data, error } = await supabase
        .from("advisor_specialties")
        .select("lead_multiplier")
        .eq("id", opts.specialtyId)
        .maybeSingle();
      if (error) {
        log.warn("specialty multiplier lookup failed", {
          specialtyId: opts.specialtyId,
          error: error.message,
        });
      } else if (data?.lead_multiplier != null) {
        specialtyMultiplier = Number(data.lead_multiplier);
      }
    } catch (err) {
      log.warn("specialty multiplier lookup threw", {
        specialtyId: opts.specialtyId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (opts.firmId) {
    try {
      const { data, error } = await supabase
        .from("advisor_firms")
        .select("pricing_tier_id, firm_pricing_tiers(multiplier)")
        .eq("id", opts.firmId)
        .maybeSingle();
      if (error) {
        log.warn("firm tier lookup failed", {
          firmId: opts.firmId,
          error: error.message,
        });
      } else {
        const tier =
          (data as unknown as { firm_pricing_tiers?: { multiplier: number } | null } | null)
            ?.firm_pricing_tiers;
        if (tier?.multiplier != null) {
          firmTierMultiplier = Number(tier.multiplier);
        }
      }
    } catch (err) {
      log.warn("firm tier lookup threw", {
        firmId: opts.firmId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { specialtyMultiplier, firmTierMultiplier };
}

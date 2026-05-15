/**
 * Pro subscription tiers — monthly-fee SaaS layer on top of the
 * pay-per-accept credit model.
 *
 * Tiers (admin-tunable, but constants for v1):
 *
 *   free      A$0     0%   priority weight delta. Existing behaviour.
 *   starter   A$29    +20% priority in marketplace ranking.
 *   growth    A$99    +50% priority + AI summary feature unlocked + "Growth" badge.
 *   scale     A$249   +100% priority + 2× accept cap + featured-pro slot.
 *
 * The actual Stripe subscription lifecycle is gated behind feature flag
 * `pro_subscriptions_billing` (default OFF — no live billing in prod
 * until you flip it). Until then the tier can be admin-set for testing
 * and the marketplace already honours it.
 */

// eslint-disable-next-line no-restricted-imports -- pro subscription writes happen on the pro's behalf during admin override or Stripe webhook (no auth.uid()).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("pro-subscription");

export type ProSubscriptionTier = "free" | "starter" | "growth" | "scale";
export type ProSubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export interface ProSubscriptionConfig {
  tier: ProSubscriptionTier;
  monthlyPriceCents: number;
  priorityWeightBps: number; // basis points added to the ranking score
  acceptCapMultiplier: number;
  perks: string[];
}

export const SUBSCRIPTION_CONFIGS: Record<ProSubscriptionTier, ProSubscriptionConfig> = {
  free: {
    tier: "free",
    monthlyPriceCents: 0,
    priorityWeightBps: 0,
    acceptCapMultiplier: 1,
    perks: ["Standard marketplace ranking", "Pay-per-accept credits"],
  },
  starter: {
    tier: "starter",
    monthlyPriceCents: 2900,
    priorityWeightBps: 2000,
    acceptCapMultiplier: 1,
    perks: ["+20% priority weight", "Standard accept cap", "Email digest priority slot"],
  },
  growth: {
    tier: "growth",
    monthlyPriceCents: 9900,
    priorityWeightBps: 5000,
    acceptCapMultiplier: 1.5,
    perks: [
      "+50% priority weight",
      "1.5× accept cap",
      "AI profile summary unlocked",
      "Growth tier badge",
    ],
  },
  scale: {
    tier: "scale",
    monthlyPriceCents: 24900,
    priorityWeightBps: 10000,
    acceptCapMultiplier: 2,
    perks: [
      "+100% priority weight",
      "2× accept cap",
      "Featured pro slot on /advisors",
      "Scale tier badge",
      "Priority support",
    ],
  },
};

export function getTierConfig(tier: ProSubscriptionTier): ProSubscriptionConfig {
  return SUBSCRIPTION_CONFIGS[tier];
}

export async function getProSubscription(
  professionalId: number,
): Promise<{
  tier: ProSubscriptionTier;
  status: ProSubscriptionStatus;
  periodEnd: string | null;
}> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("professionals")
      .select(
        "subscription_tier, subscription_status, subscription_current_period_end",
      )
      .eq("id", professionalId)
      .maybeSingle();
    return {
      tier: (data?.subscription_tier as ProSubscriptionTier) ?? "free",
      status:
        (data?.subscription_status as ProSubscriptionStatus) ?? "inactive",
      periodEnd:
        (data?.subscription_current_period_end as string | null) ?? null,
    };
  } catch (err) {
    log.warn("getProSubscription read failed", {
      professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { tier: "free", status: "inactive", periodEnd: null };
  }
}

export async function setProSubscriptionTier(input: {
  professionalId: number;
  tier: ProSubscriptionTier;
  status?: ProSubscriptionStatus;
  periodEnd?: Date | string | null;
  stripeId?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const updates: Record<string, unknown> = {
    subscription_tier: input.tier,
    subscription_status: input.status ?? "active",
  };
  if (input.periodEnd !== undefined) {
    updates.subscription_current_period_end =
      input.periodEnd instanceof Date
        ? input.periodEnd.toISOString()
        : input.periodEnd;
  }
  if (input.tier !== "free" && updates.subscription_started_at == null) {
    updates.subscription_started_at = new Date().toISOString();
  }
  if (input.stripeId !== undefined) {
    updates.subscription_stripe_id = input.stripeId;
  }
  const { error } = await admin
    .from("professionals")
    .update(updates)
    .eq("id", input.professionalId);
  if (error) {
    throw new Error(`setProSubscriptionTier failed: ${error.message}`);
  }
  log.info("subscription tier set", {
    professionalId: input.professionalId,
    tier: input.tier,
    status: input.status ?? "active",
  });
}

/**
 * Priority weight delta in basis points (added to the marketplace ranking
 * score). Returns 0 for free tier so /advisors ranking is back-compat.
 */
export function getPriorityWeightBps(tier: ProSubscriptionTier): number {
  return SUBSCRIPTION_CONFIGS[tier].priorityWeightBps;
}

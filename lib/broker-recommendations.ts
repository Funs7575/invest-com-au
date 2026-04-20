import { createAdminClient } from "@/lib/supabase/admin";

export interface BrokerRecommendationContext {
  experience_level?: string;
  investment_range?: string;
  trading_interest?: string;
  top_match_slug?: string;
  source?: string;
}

export interface RecommendedBroker {
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  asx_fee: string | null;
  rating: number | null;
  affiliate_url: string;
  affiliateUrl: string; // tracking URL via /api/drip-click
}

/** Broker row shape consumed by the scorer — a subset of the brokers table. */
export interface ScorableBroker {
  slug: string;
  name: string;
  rating: number | null;
  us_fee_value: number | null;
  asx_fee_value: number | null;
}

/**
 * Pure scoring heuristic for the drip-email recommender. Exported for unit
 * tests — the DB layer in `getPersonalizedBrokers` just wraps this.
 *
 *  - baseline = rating * 10 (rating defaults to 3 if null)
 *  - +100 if broker.slug === ctx.top_match_slug (quiz "top match")
 *  - +max(0, 20 - us_fee_value) when ctx.trading_interest includes "us_shares"
 *  - +15 when ctx.experience_level is "beginner" and rating > 4
 *  - +max(0, 15 - asx_fee_value) for high-investment cohorts
 *    (range key contains large/xlarge/whale/$50,000/$100,000)
 */
export function scoreBrokerForContext(
  broker: ScorableBroker,
  ctx: BrokerRecommendationContext,
): number {
  let score = (broker.rating ?? 3) * 10;

  if (ctx.top_match_slug && broker.slug === ctx.top_match_slug) {
    score += 100;
  }

  if (
    ctx.trading_interest?.includes("us_shares") &&
    broker.us_fee_value != null
  ) {
    score += Math.max(0, 20 - broker.us_fee_value);
  }

  if (
    ctx.experience_level &&
    ctx.experience_level.toLowerCase() === "beginner" &&
    broker.rating != null &&
    broker.rating > 4
  ) {
    score += 15;
  }

  const highRangePatterns = [
    "large",
    "xlarge",
    "whale",
    "$50,000",
    "$100,000",
  ];
  if (
    ctx.investment_range &&
    highRangePatterns.some((p) =>
      ctx.investment_range!.toLowerCase().includes(p.toLowerCase()),
    ) &&
    broker.asx_fee_value != null
  ) {
    score += Math.max(0, 15 - broker.asx_fee_value);
  }

  return score;
}

/**
 * Returns the top 3 personalized broker recommendations based on user context.
 * Delegates scoring to `scoreBrokerForContext` — see that function for the
 * heuristic details.
 */
export async function getPersonalizedBrokers(
  ctx: BrokerRecommendationContext,
  opts?: { email?: string; dripNumber?: number }
): Promise<RecommendedBroker[]> {
  const supabase = createAdminClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "name, slug, logo_url, tagline, asx_fee, asx_fee_value, us_fee, us_fee_value, rating, affiliate_url"
    )
    .eq("status", "active")
    .not("affiliate_url", "is", null)
    .order("rating", { ascending: false })
    .limit(50);

  if (!brokers || brokers.length === 0) return [];

  const scored = brokers.map((b) => ({
    broker: b,
    score: scoreBrokerForContext(b, ctx),
  }));

  // Sort by score descending, then rating descending, then name ascending
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (b.broker.rating ?? 0) - (a.broker.rating ?? 0) ||
      a.broker.name.localeCompare(b.broker.name)
  );

  const dripNum = opts?.dripNumber ?? 4;

  return scored.slice(0, 3).map(({ broker }) => {
    // Build tracking URL through /api/drip-click for click attribution
    const trackingParams = new URLSearchParams({
      ...(opts?.email ? { email: opts.email } : {}),
      drip: String(dripNum),
      broker: broker.slug,
    });
    const affiliateUrl = `/api/drip-click?${trackingParams.toString()}`;

    return {
      name: broker.name,
      slug: broker.slug,
      logo_url: broker.logo_url ?? null,
      tagline: broker.tagline ?? null,
      asx_fee: broker.asx_fee ?? null,
      rating: broker.rating ?? null,
      affiliate_url: broker.affiliate_url!,
      affiliateUrl,
    };
  });
}

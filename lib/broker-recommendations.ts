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

/**
 * Returns the top 3 personalized broker recommendations based on user context.
 *
 * Scoring heuristic:
 *  - top_match_slug from the quiz gets a large boost (+100)
 *  - trading_interest containing "us_shares" boosts brokers with low us_fee
 *  - experience_level "beginner" boosts highly-rated brokers (rating > 4)
 *  - high investment_range boosts low-fee brokers
 *  - baseline: sort by rating descending
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

  // Score each broker based on user context
  const scored = brokers.map((b) => {
    let score = (b.rating ?? 3) * 10; // baseline: rating * 10

    // If quiz provided a top match, give it a massive boost
    if (ctx.top_match_slug && b.slug === ctx.top_match_slug) {
      score += 100;
    }

    // If user is interested in US shares, boost low-fee US brokers
    if (ctx.trading_interest?.includes("us_shares") && b.us_fee_value != null) {
      // Lower US fee → higher boost (max ~20 points for $0 fee)
      score += Math.max(0, 20 - b.us_fee_value);
    }

    // Beginners prefer simple, highly-rated platforms
    if (
      ctx.experience_level &&
      ctx.experience_level.toLowerCase() === "beginner" &&
      b.rating &&
      b.rating > 4
    ) {
      score += 15;
    }

    // High investment range → prefer low ASX fees
    // Handles both raw keys (large, xlarge, whale) and human-readable labels
    const highRangePatterns = ["large", "xlarge", "whale", "$50,000", "$100,000"];
    if (
      ctx.investment_range &&
      highRangePatterns.some((p) =>
        ctx.investment_range!.toLowerCase().includes(p.toLowerCase())
      ) &&
      b.asx_fee_value != null
    ) {
      // Lower ASX fee → higher boost (max ~15 points for $0 fee)
      score += Math.max(0, 15 - b.asx_fee_value);
    }

    return { broker: b, score };
  });

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

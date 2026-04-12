import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/exit-match
 *
 * Returns a personalized broker recommendation based on:
 * - Quiz results stored in qualification-store cookie/sessionStorage
 * - Shortlisted brokers (stored in cookies)
 * - Page history signals
 * - Active deals and CPA value for revenue optimization
 */
export async function GET() {
  const supabase = await createClient();

  // Fetch all active brokers
  const { data: brokers, error } = await supabase
    .from("brokers")
    .select(
      "id, slug, name, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, pros, affiliate_url, deal, deal_text, platform_type, cpa_value, status"
    )
    .eq("status", "active")
    .in("platform_type", ["share_broker", "crypto_exchange", "cfd_forex", "robo_advisor"])
    .order("rating", { ascending: false });

  if (error || !brokers || brokers.length === 0) {
    return NextResponse.json({ error: "No brokers available" }, { status: 500 });
  }

  // Read cookies for user signals
  const cookieStore = await cookies();
  const shortlistRaw = cookieStore.get("shortlist")?.value;
  const quizResultRaw = cookieStore.get("quiz_result")?.value;
  const pageHistoryRaw = cookieStore.get("page_history")?.value;

  let shortlist: string[] = [];
  let quizPlatformType: string | null = null;
  let pageHistory: string[] = [];
  let reason = "Top-rated broker for Australian investors";

  try {
    if (shortlistRaw) shortlist = JSON.parse(shortlistRaw);
  } catch { /* ignore */ }

  try {
    if (quizResultRaw) {
      const quiz = JSON.parse(quizResultRaw);
      quizPlatformType = quiz.platform_type || quiz.platformType || null;
    }
  } catch { /* ignore */ }

  try {
    if (pageHistoryRaw) pageHistory = JSON.parse(pageHistoryRaw);
  } catch { /* ignore */ }

  // Determine if user was looking at US shares content
  const interestedInUS = pageHistory.some(
    (p) => p.includes("us-shares") || p.includes("us-stocks") || p.includes("international")
  );

  // Score each broker
  const scored = brokers.map((broker) => {
    let score = 0;

    // +10 if in user's shortlist
    if (shortlist.includes(broker.slug)) {
      score += 10;
    }

    // +5 if matches quiz platform_type preference
    if (quizPlatformType && broker.platform_type === quizPlatformType) {
      score += 5;
    }

    // +3 for highest rating (normalized: rating/5 * 3)
    if (broker.rating) {
      score += (broker.rating / 5) * 3;
    }

    // +5 for broker with active deal
    if (broker.deal && broker.deal_text) {
      score += 5;
    }

    // +2 for highest CPA value (revenue optimization, normalized)
    if (broker.cpa_value && broker.cpa_value > 0) {
      score += Math.min(2, broker.cpa_value / 200);
    }

    // +1 if broker has affiliate URL (we can actually convert)
    if (broker.affiliate_url) {
      score += 1;
    }

    return { broker, score };
  });

  // Sort by score descending, then rating
  scored.sort((a, b) => b.score - a.score || (b.broker.rating || 0) - (a.broker.rating || 0));

  const best = scored[0];

  // Determine reason string
  if (shortlist.includes(best.broker.slug)) {
    reason = "Based on your shortlist — this was your top pick";
  } else if (quizPlatformType && best.broker.platform_type === quizPlatformType) {
    reason = `Matches your preference for ${best.broker.platform_type.replace(/_/g, " ")}s`;
  } else if (interestedInUS && best.broker.us_fee) {
    reason = "Based on your interest in US shares";
  } else if (best.broker.deal && best.broker.deal_text) {
    reason = `Currently offering an exclusive deal for new accounts`;
  } else if (best.broker.rating && best.broker.rating >= 4.5) {
    reason = `Rated ${best.broker.rating}/5 — highest-rated for your profile`;
  } else if (best.broker.asx_fee_value === 0) {
    reason = "$0 brokerage on ASX trades — the cheapest option available";
  }

  return NextResponse.json({
    broker: {
      slug: best.broker.slug,
      name: best.broker.name,
      color: best.broker.color,
      icon: best.broker.icon,
      logo_url: best.broker.logo_url,
      rating: best.broker.rating || 0,
      asx_fee: best.broker.asx_fee || "N/A",
      pros: best.broker.pros || [],
      deal_text: best.broker.deal_text || null,
      affiliate_url: best.broker.affiliate_url || null,
    },
    reason,
  });
}

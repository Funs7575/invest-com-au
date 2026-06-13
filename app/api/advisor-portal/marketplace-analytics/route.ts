import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  medianOf,
  suggestedResponseWindow,
  SIMILAR_BRIEFS_MIN_SAMPLE,
  ACCEPTED_MEDIAN_MIN_SAMPLE,
} from "@/lib/brief-intel";

const log = logger("advisor-marketplace-analytics");

interface BidWithAuction {
  id: number;
  bid_amount: number;
  status: string;
  created_at: string;
  auction_id: number;
  retract_reason: string | null;
  advisor_auctions: {
    id: number;
    created_at: string;
    advisor_types: string[] | null;
  } | null;
}

/**
 * GET /api/advisor-portal/marketplace-analytics
 *
 * Returns win/loss + response-time analytics for the authed advisor on
 * public quote requests, plus the category-average win rate the
 * advisor's primary type so they can benchmark themselves (#14 + #8).
 */
export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`adv-analytics:${ip}`, 30, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const supa = await createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const admin = createAdminClient();
    const { data: advisor } = await admin
      .from("professionals")
      .select("id, type")
      .eq("email", user.email)
      .eq("status", "active")
      .maybeSingle();
    if (!advisor) return NextResponse.json({ error: "Advisor not found." }, { status: 404 });

    const since = new Date(Date.now() - 30 * 86400_000).toISOString();

    const { data: bidsRaw } = await admin
      .from("advisor_auction_bids")
      .select(`
        id, bid_amount, status, created_at, auction_id, retract_reason,
        advisor_auctions:auction_id ( id, created_at, advisor_types )
      `)
      .eq("advisor_id", advisor.id)
      .gte("created_at", since);

    const bids = (bidsRaw ?? []) as unknown as BidWithAuction[];
    // Only count bids on jobs whose advisor_types includes this advisor's type
    // (avoids polluting category-rate when a sponsorship-style auction is included).
    const myType = advisor.type as string;
    const myBids = bids.filter((b) => b.advisor_auctions?.advisor_types?.includes(myType) ?? true);

    const total = myBids.length;
    const wins = myBids.filter((b) => b.status === "won").length;
    const lost = myBids.filter((b) => b.status === "lost").length;
    const retracted = myBids.filter((b) => b.status === "retracted").length;
    const active = myBids.filter((b) => b.status === "active").length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Response time: how fast did THIS advisor bid after the auction was posted?
    const responseTimesMs = myBids
      .filter((b) => b.advisor_auctions?.created_at)
      .map((b) => new Date(b.created_at).getTime() - new Date(b.advisor_auctions!.created_at).getTime())
      .filter((ms) => ms >= 0);
    responseTimesMs.sort((a, b) => a - b);
    const medianResponseHours =
      responseTimesMs.length > 0
        ? Math.round(
            (responseTimesMs[Math.floor(responseTimesMs.length / 2)]! / 3600_000) * 10,
          ) / 10
        : null;

    // Category benchmark: win rate across all advisors of the same type,
    // plus Bid Coach aggregates (response-time + winning-bid medians).
    // Anonymised: no advisor identities or individual bids leave this
    // handler — only medians over the category, suppressed at small n.
    const { data: catBidsRaw } = await admin
      .from("advisor_auction_bids")
      .select(`
        status,
        bid_amount,
        created_at,
        advisor_auctions:auction_id!inner ( source, advisor_types, created_at )
      `)
      .gte("created_at", since)
      .neq("status", "retracted")
      .limit(5000);

    const catBids = (catBidsRaw ?? []) as unknown as {
      status: string;
      bid_amount: number | null;
      created_at: string | null;
      advisor_auctions: {
        source: string;
        advisor_types: string[] | null;
        created_at: string | null;
      } | null;
    }[];
    const myCategoryBids = catBids.filter(
      (b) =>
        b.advisor_auctions?.source === "public_job" &&
        b.advisor_auctions?.advisor_types?.includes(myType),
    );
    const catWins = myCategoryBids.filter((b) => b.status === "won").length;
    const catWinRate = myCategoryBids.length > 0
      ? Math.round((catWins / myCategoryBids.length) * 100)
      : 0;

    // ── Bid Coach aggregates ────────────────────────────────────────────
    const responseHoursOf = (b: (typeof myCategoryBids)[number]): number | null => {
      if (!b.created_at || !b.advisor_auctions?.created_at) return null;
      const h =
        (new Date(b.created_at).getTime() -
          new Date(b.advisor_auctions.created_at).getTime()) /
        3_600_000;
      return Number.isFinite(h) && h >= 0 ? h : null;
    };
    const round1 = (v: number | null): number | null =>
      v === null ? null : Math.round(v * 10) / 10;

    const categorySample = myCategoryBids.length;
    const categoryResponseHours = myCategoryBids
      .map(responseHoursOf)
      .filter((h): h is number => h !== null);
    const wonBids = myCategoryBids.filter((b) => b.status === "won");
    const wonResponseHours = wonBids
      .map(responseHoursOf)
      .filter((h): h is number => h !== null);
    const wonAmounts = wonBids
      .map((b) => b.bid_amount)
      .filter((a): a is number => typeof a === "number" && a > 0);

    // Suppression: category-wide medians need ≥5 bids; winning-bid medians
    // need ≥3 wins (same thresholds as the brief-dossier intel).
    const categoryMedianResponseHours =
      categorySample >= SIMILAR_BRIEFS_MIN_SAMPLE &&
      categoryResponseHours.length >= SIMILAR_BRIEFS_MIN_SAMPLE
        ? round1(medianOf(categoryResponseHours))
        : null;
    const winningMedianResponseHours =
      wonResponseHours.length >= ACCEPTED_MEDIAN_MIN_SAMPLE
        ? round1(medianOf(wonResponseHours))
        : null;
    const winningMedianBidCents =
      wonAmounts.length >= ACCEPTED_MEDIAN_MIN_SAMPLE
        ? medianOf(wonAmounts)
        : null;
    const responseSuggestion = suggestedResponseWindow(
      winningMedianResponseHours ?? categoryMedianResponseHours,
    );

    return NextResponse.json({
      window_days: 30,
      total_bids: total,
      wins,
      lost,
      retracted,
      active,
      win_rate_pct: winRate,
      median_response_hours: medianResponseHours,
      category_avg_win_rate_pct: catWinRate,
      // Bid Coach extension (null = suppressed / not enough history):
      category_sample_size: categorySample,
      category_median_response_hours: categoryMedianResponseHours,
      category_winning_median_response_hours: winningMedianResponseHours,
      category_median_winning_bid_cents:
        winningMedianBidCents === null ? null : Math.round(winningMedianBidCents),
      suggested_response_window_hours: responseSuggestion?.windowHours ?? null,
    });
  } catch (err) {
    log.error("Analytics GET error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}

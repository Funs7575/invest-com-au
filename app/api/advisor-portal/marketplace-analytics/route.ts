import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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

    // Category benchmark: win rate across all advisors of the same type
    const { data: catBidsRaw } = await admin
      .from("advisor_auction_bids")
      .select(`
        status,
        advisor_auctions:auction_id!inner ( source, advisor_types )
      `)
      .gte("created_at", since)
      .neq("status", "retracted")
      .limit(5000);

    const catBids = (catBidsRaw ?? []) as unknown as {
      status: string;
      advisor_auctions: { source: string; advisor_types: string[] | null } | null;
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
    });
  } catch (err) {
    log.error("Analytics GET error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}

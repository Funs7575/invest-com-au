import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("jobs:slug");

/**
 * GET /api/jobs/[slug] — Public job detail + bids.
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

    const admin = createAdminClient();

    const { data: auction, error: auctionError } = await admin
      .from("advisor_auctions")
      .select(`
        id,
        slug,
        job_title,
        job_description,
        budget_band,
        advisor_types,
        location,
        contact_name,
        status,
        ends_at,
        winning_bid_id,
        created_at
      `)
      .eq("slug", slug)
      .eq("is_public", true)
      .eq("source", "public_job")
      .maybeSingle();

    if (auctionError || !auction) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    // Fetch bids with advisor info (only public-safe columns)
    const { data: bids } = await admin
      .from("advisor_auction_bids")
      .select(`
        id,
        bid_amount,
        status,
        created_at,
        advisor_id,
        professionals:advisor_id (
          id,
          slug,
          name,
          firm_name,
          type,
          photo_url,
          rating,
          review_count,
          location_display,
          verified
        )
      `)
      .eq("auction_id", auction.id)
      .order("bid_amount", { ascending: true });

    return NextResponse.json({
      job: auction,
      bids: bids || [],
    });
  } catch (err) {
    log.error("Job detail error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
  }
}

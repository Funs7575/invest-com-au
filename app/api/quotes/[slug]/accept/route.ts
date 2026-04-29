import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("jobs:accept");

/**
 * POST /api/jobs/[slug]/accept — Consumer accepts a winning bid.
 *
 * Authentication: the consumer-poster verifies via the email they used to
 * post the job. We require the same email + the bid_id. (No login required —
 * consumers post anonymously, so email-as-key is the simplest gate.)
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`job-accept:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const { slug } = await ctx.params;
    if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

    const body = await request.json();
    const { bid_id, contact_email } = body as { bid_id?: number; contact_email?: string };

    if (!bid_id || typeof bid_id !== "number") {
      return NextResponse.json({ error: "bid_id is required." }, { status: 400 });
    }
    if (!contact_email || typeof contact_email !== "string") {
      return NextResponse.json({ error: "contact_email is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id, contact_email, status, slug")
      .eq("slug", slug)
      .eq("is_public", true)
      .eq("source", "public_job")
      .maybeSingle();

    if (!auction) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (auction.contact_email?.toLowerCase() !== contact_email.toLowerCase().trim()) {
      // Don't leak which check failed
      return NextResponse.json({ error: "Verification failed." }, { status: 403 });
    }

    if (auction.status !== "open") {
      return NextResponse.json({ error: "This job is no longer open." }, { status: 400 });
    }

    const { data: bid } = await admin
      .from("advisor_auction_bids")
      .select("id, advisor_id, bid_amount, auction_id, status")
      .eq("id", bid_id)
      .eq("auction_id", auction.id)
      .maybeSingle();

    if (!bid) {
      return NextResponse.json({ error: "Bid not found." }, { status: 404 });
    }

    // Mark winner, lose all other active bids on this auction, close auction
    const { error: winnerErr } = await admin
      .from("advisor_auction_bids")
      .update({ status: "won" })
      .eq("id", bid.id);
    if (winnerErr) {
      log.error("Failed to mark winner", { err: winnerErr.message });
      return NextResponse.json({ error: "Failed to accept bid." }, { status: 500 });
    }

    await admin
      .from("advisor_auction_bids")
      .update({ status: "lost" })
      .eq("auction_id", auction.id)
      .eq("status", "active")
      .neq("id", bid.id);

    await admin
      .from("advisor_auctions")
      .update({ status: "awarded", winning_bid_id: bid.id })
      .eq("id", auction.id);

    log.info("Public job awarded", { jobId: auction.id, bidId: bid.id, advisorId: bid.advisor_id });

    return NextResponse.json({ success: true, winning_bid_id: bid.id });
  } catch (err) {
    log.error("Job accept error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to accept bid." }, { status: 500 });
  }
}

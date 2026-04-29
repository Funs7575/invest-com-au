import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { AcceptBidRequest } from "@/lib/api-schemas";
import { sendAdvisorBidAcceptedEmail } from "@/lib/quote-emails";

const log = logger("quotes:accept");

/**
 * POST /api/quotes/[slug]/accept — Consumer accepts a winning bid.
 *
 * Auth: email-as-key. Consumer verifies with the email they used to post.
 * Contact info is only shared with the winning advisor after accept.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`quote-accept:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const { slug } = await ctx.params;
    if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = AcceptBidRequest.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid request body.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { bid_id, contact_email } = parsed.data;

    const admin = createAdminClient();

    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id, contact_email, contact_name, status, slug")
      .eq("slug", slug)
      .eq("is_public", true)
      .eq("source", "public_job")
      .maybeSingle();

    if (!auction) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if ((auction.contact_email as string)?.toLowerCase() !== contact_email.toLowerCase().trim()) {
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

    // Mark winner, mark all other active bids lost, close auction
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

    // Fetch winning advisor details to send acceptance email
    const { data: advisor } = await admin
      .from("professionals")
      .select("name, email, type")
      .eq("id", bid.advisor_id)
      .maybeSingle();

    if (advisor?.email) {
      const firstName = (advisor.name as string).trim().split(" ")[0] ?? advisor.name as string;
      sendAdvisorBidAcceptedEmail(
        advisor.email as string,
        firstName,
        auction.contact_name as string || "the consumer",
        auction.contact_email as string,
        null,
        slug,
        auction.slug as string,
      ).catch((err) =>
        log.warn("Advisor accept email failed", { err: err instanceof Error ? err.message : String(err) })
      );
    }

    log.info("Public job awarded", { jobId: auction.id, bidId: bid.id, advisorId: bid.advisor_id });

    return NextResponse.json({ success: true, winning_bid_id: bid.id });
  } catch (err) {
    log.error("Quote accept error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to accept bid." }, { status: 500 });
  }
}

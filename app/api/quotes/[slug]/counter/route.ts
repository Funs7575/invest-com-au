import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { CounterBidRequest } from "@/lib/api-schemas";
import { auctionRoundsEnabled, normaliseCounterStatus } from "@/lib/auction-rounds";
import { sendCounterOfferToAdvisorEmail } from "@/lib/quote-emails";

const log = logger("quotes:counter");

/**
 * POST /api/quotes/[slug]/counter — Consumer counters a single bid (idea #11):
 * "would you do it for $X?". Records a factual price proposal; the adviser
 * accepts or declines from the portal. NO platform money movement — the fee is
 * the adviser's own and the platform never intermediates consumer→adviser money.
 *
 * Auth: email-as-key (same model as accept). Flag-gated by `auction_rounds`;
 * 404s when off so the mechanic is dormant. One PENDING counter per bid.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`quote-counter:${ip}`, 15, 60)) {
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

    const parsed = CounterBidRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request body." },
        { status: 400 },
      );
    }
    const { contact_email, bid_id, counter_amount } = parsed.data;

    const admin = createAdminClient();

    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id, slug, job_title, contact_email, status")
      .eq("slug", slug)
      .eq("is_public", true)
      .eq("source", "public_job")
      .maybeSingle();

    if (!auction) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    if (!(await auctionRoundsEnabled(auction.contact_email as string | null))) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if ((auction.contact_email as string)?.toLowerCase() !== contact_email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Verification failed." }, { status: 403 });
    }

    if (auction.status !== "open") {
      return NextResponse.json({ error: "This job is no longer open." }, { status: 400 });
    }

    const { data: bid } = await admin
      .from("advisor_auction_bids")
      .select("id, advisor_id, bid_amount, status, counter_status")
      .eq("id", bid_id)
      .eq("auction_id", auction.id)
      .maybeSingle();

    if (!bid) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    if (bid.status !== "active") {
      return NextResponse.json({ error: "You can only counter an active quote." }, { status: 400 });
    }

    // One pending counter per bid. A previously declined/accepted counter can be
    // superseded with a fresh one, but not while one is still pending.
    if (normaliseCounterStatus(bid.counter_status) === "pending") {
      return NextResponse.json(
        { error: "You already have a pending counter on this quote." },
        { status: 409 },
      );
    }

    const { error: updErr } = await admin
      .from("advisor_auction_bids")
      .update({
        counter_amount,
        counter_status: "pending",
        counter_at: new Date().toISOString(),
      })
      .eq("id", bid.id);

    if (updErr) {
      log.error("Failed to record counter", { err: updErr.message, bidId: bid.id });
      return NextResponse.json({ error: "Failed to send the counter-offer." }, { status: 500 });
    }

    // Notify the adviser (fire-and-forget).
    const { data: advisor } = await admin
      .from("professionals")
      .select("name, email")
      .eq("id", bid.advisor_id)
      .maybeSingle();

    if (advisor?.email) {
      const firstName = (advisor.name as string)?.trim().split(" ")[0] || (advisor.name as string) || "there";
      sendCounterOfferToAdvisorEmail(
        advisor.email as string,
        firstName,
        (auction.job_title as string | null) ?? "your quote request",
        auction.slug as string,
        bid.bid_amount as number,
        counter_amount,
      ).catch((err) =>
        log.warn("Counter-offer email to advisor failed", {
          advisorId: bid.advisor_id,
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    log.info("Counter recorded", { auctionId: auction.id, bidId: bid.id, counterAmount: counter_amount });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Counter error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to send the counter-offer." }, { status: 500 });
  }
}

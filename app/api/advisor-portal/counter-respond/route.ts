import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isAllowed } from "@/lib/rate-limit-db";
import { CounterRespondRequest } from "@/lib/api-schemas";
import { auctionRoundsEnabled, normaliseCounterStatus } from "@/lib/auction-rounds";
import { sendCounterOfferResultEmail } from "@/lib/quote-emails";

const log = logger("advisor-portal:counter-respond");

/**
 * POST /api/advisor-portal/counter-respond — Advisor accepts or declines a
 * pending counter-offer on one of their bids (idea #11).
 *
 * Accept → the bid_amount is updated to the agreed counter figure and the bid
 * is marked countered (counter_status='accepted'); the consumer can then accept
 * the quote as usual. Decline → counter_status='declined' and the original quote
 * stands. Email the consumer either way. No platform money movement — purely a
 * recorded factual price agreement.
 *
 * Auth: mirrors the public-quote bid flow — authenticated advisor resolved from
 * the session, scoped to an ACTIVE professional by email. Flag-gated by
 * `auction_rounds`; 404s when off.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    if (!(await isAllowed("advisor_counter_respond", `u:${user.id}`, { max: 30, refillPerSec: 0.5 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    // Flag-gate (keyed by the acting advisor). Fail closed.
    if (!(await auctionRoundsEnabled(user.email))) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = CounterRespondRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const { bid_id, action } = parsed.data;

    const admin = createAdminClient();

    const { data: advisor } = await admin
      .from("professionals")
      .select("id")
      .eq("email", user.email ?? "")
      .eq("status", "active")
      .single();

    if (!advisor) return NextResponse.json({ error: "Advisor profile not found." }, { status: 404 });

    // Load the bid + its auction; scope strictly to THIS advisor's own bid.
    const { data: bid } = await admin
      .from("advisor_auction_bids")
      .select(`
        id,
        advisor_id,
        bid_amount,
        counter_amount,
        counter_status,
        advisor_auctions!inner ( id, slug, job_title, contact_name, contact_email, status, source )
      `)
      .eq("id", bid_id)
      .eq("advisor_id", advisor.id)
      .maybeSingle();

    if (!bid) return NextResponse.json({ error: "Counter-offer not found." }, { status: 404 });

    if (normaliseCounterStatus(bid.counter_status) !== "pending") {
      return NextResponse.json({ error: "There is no pending counter on this quote." }, { status: 400 });
    }

    const auction = bid.advisor_auctions as unknown as {
      id: number;
      slug: string;
      job_title: string | null;
      contact_name: string | null;
      contact_email: string | null;
      status: string;
      source: string;
    } | null;

    if (!auction || auction.source !== "public_job") {
      return NextResponse.json({ error: "Counter-offer not found." }, { status: 404 });
    }
    if (auction.status !== "open") {
      return NextResponse.json({ error: "This request is no longer open." }, { status: 400 });
    }

    const counterAmount = bid.counter_amount as number | null;
    if (action === "accept" && (counterAmount == null || counterAmount <= 0)) {
      return NextResponse.json({ error: "This counter is no longer valid." }, { status: 400 });
    }

    // Accept: update the quote to the agreed figure + mark accepted. Decline:
    // record the decline; the original bid_amount is untouched.
    const update =
      action === "accept"
        ? { bid_amount: counterAmount as number, counter_status: "accepted" as const }
        : { counter_status: "declined" as const };

    const { error: updErr } = await admin
      .from("advisor_auction_bids")
      .update(update)
      .eq("id", bid.id)
      .eq("counter_status", "pending"); // guard against a double-submit race

    if (updErr) {
      log.error("Failed to respond to counter", { err: updErr.message, bidId: bid.id });
      return NextResponse.json({ error: "Failed to respond to the counter-offer." }, { status: 500 });
    }

    // Email the consumer (fire-and-forget).
    if (auction.contact_email) {
      const firstName = (auction.contact_name ?? "").trim().split(" ")[0] || "there";
      const { data: advisorRow } = await admin
        .from("professionals")
        .select("name")
        .eq("id", advisor.id)
        .maybeSingle();
      const advisorName = (advisorRow?.name as string | null) ?? "Your advisor";
      const agreedAmount = action === "accept" ? (counterAmount as number) : (bid.bid_amount as number);

      sendCounterOfferResultEmail(
        auction.contact_email,
        firstName,
        auction.job_title ?? "your quote request",
        auction.slug,
        advisorName,
        action === "accept",
        agreedAmount,
      ).catch((err) =>
        log.warn("Counter-offer result email failed", {
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    log.info("Counter responded", { bidId: bid.id, advisorId: advisor.id, action });

    return NextResponse.json({ success: true, action });
  } catch (err) {
    log.error("Counter-respond error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to respond to the counter-offer." }, { status: 500 });
  }
}

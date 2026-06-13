import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { isAllowed } from "@/lib/rate-limit-db";
import { sendConsumerBidReceivedEmail } from "@/lib/quote-emails";
import { auctionRoundsEnabled, finalRoundActive } from "@/lib/auction-rounds";

const log = logger("advisor-auction-bid");

const MINIMUM_BID_CENTS = 50_00; // $50 minimum bid

const BidBody = z.object({
  auction_id: z.number().int().positive(),
  bid_amount: z
    .number()
    .int()
    .min(MINIMUM_BID_CENTS, `Minimum bid is $${(MINIMUM_BID_CENTS / 100).toFixed(2)}.`),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate advisor
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // Rate-limit per advisor — bidding is a write that also fires a consumer
    // notification email; cap repeated submissions.
    if (!(await isAllowed("advisor_auction_bid", `u:${user.id}`, { max: 30, refillPerSec: 0.5 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = BidBody.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const { auction_id, bid_amount } = parsed.data;

    const admin = createAdminClient();

    // Look up advisor by user email. `professionals` is the canonical advisor
    // table (the whole portal queries it) — `advisors` does not exist, so this
    // lookup always returned null and the bid surface 404'd for every advisor.
    const { data: advisor } = await admin
      .from("professionals")
      .select("id, name, email, type, credit_balance_cents")
      .eq("email", user.email)
      .eq("status", "active")
      .single();

    if (!advisor) {
      return NextResponse.json(
        { error: "Advisor profile not found." },
        { status: 404 }
      );
    }

    // Verify auction exists and is still open. final_round_* are selected for
    // idea #11 — best-and-final rounds; reads are fail-soft (undefined when the
    // columns are absent / the migration hasn't run).
    const { data: auction } = await admin
      .from("advisor_auctions")
      .select(
        "id, status, ends_at, source, contact_email, contact_name, job_title, slug, final_round_ends_at, final_round_started_at",
      )
      .eq("id", auction_id)
      .single();

    if (!auction) {
      return NextResponse.json(
        { error: "Auction not found." },
        { status: 404 }
      );
    }

    if (auction.status !== "open") {
      return NextResponse.json(
        { error: "This auction is no longer accepting bids." },
        { status: 400 }
      );
    }

    if (new Date(auction.ends_at) < new Date()) {
      return NextResponse.json(
        { error: "This auction has expired." },
        { status: 400 }
      );
    }

    // Check advisor hasn't already bid on this auction
    const { data: existingBid } = await admin
      .from("advisor_auction_bids")
      .select("id, bid_amount")
      .eq("auction_id", auction_id)
      .eq("advisor_id", advisor.id)
      .maybeSingle();

    if (existingBid) {
      // Idea #11 — best-and-final round. On a PUBLIC quote with an active final
      // round (and the auction_rounds flag on), the advisor may submit ONE
      // revised quote in EITHER direction (a final round sharpens pricing, often
      // downward — the "must exceed" rule is lead-auction logic and would block
      // that). Outside a final round, the original "must exceed" rule is
      // unchanged, so non-public auctions and ordinary public re-bids behave
      // exactly as today.
      const inFinalRound =
        auction.source === "public_job" &&
        finalRoundActive(auction as { final_round_ends_at?: string | null }) &&
        (await auctionRoundsEnabled(auction.contact_email as string | null));

      if (!inFinalRound && bid_amount <= existingBid.bid_amount) {
        return NextResponse.json(
          {
            error: `Your new bid must exceed your current bid of $${(existingBid.bid_amount / 100).toFixed(2)}.`,
          },
          { status: 400 }
        );
      }

      const { error: updateError } = await admin
        .from("advisor_auction_bids")
        .update(inFinalRound ? { bid_amount, round_number: 2 } : { bid_amount })
        .eq("id", existingBid.id);

      if (updateError) {
        log.error("Failed to update bid", { error: updateError.message });
        return NextResponse.json(
          { error: "Failed to update bid." },
          { status: 500 }
        );
      }

      log.info("Bid updated", {
        bidId: existingBid.id,
        auctionId: auction_id,
        advisorId: advisor.id,
        oldAmount: existingBid.bid_amount,
        newAmount: bid_amount,
      });

      // Check if this is now the highest bid
      const { data: highBids } = await admin
        .from("advisor_auction_bids")
        .select("id, advisor_id, bid_amount")
        .eq("auction_id", auction_id)
        .eq("status", "active")
        .order("bid_amount", { ascending: false })
        .limit(1);

      const isLeading = highBids?.[0]?.advisor_id === advisor.id;

      return NextResponse.json({
        bid_id: existingBid.id,
        bid_amount,
        is_leading: isLeading,
        message: isLeading
          ? "Your bid is now the highest!"
          : "Bid updated. You are not currently the highest bidder.",
      });
    }

    // Place new bid
    const { data: newBid, error: insertError } = await admin
      .from("advisor_auction_bids")
      .insert({
        auction_id,
        advisor_id: advisor.id,
        bid_amount,
        status: "active",
      })
      .select("id")
      .single();

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already placed a bid on this auction." },
          { status: 409 }
        );
      }
      log.error("Failed to place bid", { error: insertError.message });
      return NextResponse.json(
        { error: "Failed to place bid." },
        { status: 500 }
      );
    }

    log.info("Bid placed", {
      bidId: newBid.id,
      auctionId: auction_id,
      advisorId: advisor.id,
      amount: bid_amount,
    });

    // Check if this is the highest bid
    const { data: highBids } = await admin
      .from("advisor_auction_bids")
      .select("id, advisor_id, bid_amount")
      .eq("auction_id", auction_id)
      .eq("status", "active")
      .order("bid_amount", { ascending: false })
      .limit(1);

    const isLeading = highBids?.[0]?.advisor_id === advisor.id;

    // For public jobs, notify the consumer about their new quote (fire-and-forget)
    if (auction.source === "public_job" && auction.contact_email) {
      const { data: bidCountRow } = await admin
        .from("advisor_auction_bids")
        .select("id", { count: "exact", head: true })
        .eq("auction_id", auction_id)
        .eq("status", "active");

      const totalBids = (bidCountRow as unknown as { count: number } | null)?.count ?? 1;
      const consumerFirst =
        ((auction.contact_name as string | null) ?? "").trim().split(" ")[0] ||
        "there";

      sendConsumerBidReceivedEmail(
        auction.contact_email as string,
        consumerFirst,
        (auction.job_title as string | null) ?? "Your quote request",
        (auction.slug as string | null) ?? "",
        advisor.name as string,
        advisor.type as string,
        totalBids,
      ).catch((err) =>
        log.warn("Consumer bid notification failed", {
          err: err instanceof Error ? err.message : String(err),
        })
      );
    }

    return NextResponse.json({
      bid_id: newBid.id,
      bid_amount,
      is_leading: isLeading,
      message: isLeading
        ? "Your bid is the highest!"
        : "Bid placed. You are not currently the highest bidder.",
    });
  } catch (err) {
    log.error("Bid error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to place bid." },
      { status: 500 }
    );
  }
}

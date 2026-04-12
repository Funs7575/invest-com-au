import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("advisor-auction-bid");

const MINIMUM_BID_CENTS = 50_00; // $50 minimum bid

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

    const body = await request.json();
    const { auction_id, bid_amount } = body;

    if (!auction_id || typeof auction_id !== "number") {
      return NextResponse.json(
        { error: "auction_id is required." },
        { status: 400 }
      );
    }

    if (!bid_amount || typeof bid_amount !== "number" || bid_amount < MINIMUM_BID_CENTS) {
      return NextResponse.json(
        {
          error: `Minimum bid is $${(MINIMUM_BID_CENTS / 100).toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Look up advisor by user email
    const { data: advisor } = await admin
      .from("advisors")
      .select("id, name, email, credit_balance_cents")
      .eq("email", user.email)
      .single();

    if (!advisor) {
      return NextResponse.json(
        { error: "Advisor profile not found." },
        { status: 404 }
      );
    }

    // Verify auction exists and is still open
    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id, status, ends_at")
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
      // Update existing bid if new amount is higher
      if (bid_amount <= existingBid.bid_amount) {
        return NextResponse.json(
          {
            error: `Your new bid must exceed your current bid of $${(existingBid.bid_amount / 100).toFixed(2)}.`,
          },
          { status: 400 }
        );
      }

      const { error: updateError } = await admin
        .from("advisor_auction_bids")
        .update({ bid_amount })
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

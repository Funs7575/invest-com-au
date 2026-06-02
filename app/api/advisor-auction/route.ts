import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("advisor-auction");

/**
 * POST /api/advisor-auction — Create a new lead auction.
 * Called internally when a hot lead (score 80+) is created.
 */
async function createAuction(request: NextRequest) {
  try {
    // eslint-disable-next-line invest/no-unvalidated-req-json -- internal-secret-gated; lead_id/lead_type presence-checked inline (P2: migrate to Zod)
    const body = await request.json();
    const { lead_id, lead_type, location, budget_range } = body;

    if (!lead_id || !lead_type) {
      return NextResponse.json(
        { error: "lead_id and lead_type are required." },
        { status: 400 }
      );
    }

    // Verify internal caller via secret header
    const internalSecret = request.headers.get("x-internal-secret");
    if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized. Internal endpoint only." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // Check the lead isn't already in an auction
    const { data: existing } = await admin
      .from("advisor_auctions")
      .select("id")
      .eq("lead_id", lead_id)
      .in("status", ["open", "closed", "awarded"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An auction already exists for this lead." },
        { status: 409 }
      );
    }

    // Create auction with 1-hour bidding window
    const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data: auction, error: dbError } = await admin
      .from("advisor_auctions")
      .insert({
        lead_id,
        lead_type,
        location: location || null,
        budget_range: budget_range || null,
        status: "open",
        ends_at: endsAt,
      })
      .select("id, ends_at")
      .single();

    if (dbError) {
      log.error("Failed to create auction", { error: dbError.message });
      return NextResponse.json(
        { error: "Failed to create auction." },
        { status: 500 }
      );
    }

    log.info("Auction created", {
      auctionId: auction.id,
      leadId: lead_id,
      leadType: lead_type,
      endsAt,
    });

    return NextResponse.json({
      id: auction.id,
      ends_at: auction.ends_at,
      status: "open",
    });
  } catch (err) {
    log.error("Create auction error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create auction." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/advisor-auction?advisor_id=xxx — Return active auctions for an advisor.
 * Matches auctions to the advisor's type and location. Auth required.
 */
async function getAuctions(_request: NextRequest) {
  try {
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

    const admin = createAdminClient();

    // SECURITY: resolve the advisor from the AUTHENTICATED session — never from a
    // client-supplied ?advisor_id=. Trusting that param was an IDOR that let any
    // logged-in advisor read competitors' bid amounts and won-lead history.
    // Mirrors the public-bids handler, which scopes to the caller's own email.
    const { data: advisor } = await admin
      .from("advisors")
      .select("id, type, location_state, location_suburb")
      .eq("email", user.email ?? "")
      .single();

    if (!advisor) {
      return NextResponse.json(
        { error: "Advisor not found." },
        { status: 404 }
      );
    }

    // Get open auctions that match advisor's type
    // Location matching is soft — all open auctions of matching type are shown
    const now = new Date().toISOString();
    const { data: auctions, error: auctionError } = await admin
      .from("advisor_auctions")
      .select(`
        id,
        lead_type,
        location,
        budget_range,
        status,
        ends_at,
        created_at
      `)
      .eq("status", "open")
      .gt("ends_at", now)
      .order("ends_at", { ascending: true });

    if (auctionError) {
      log.error("Failed to fetch auctions", { error: auctionError.message });
      return NextResponse.json(
        { error: "Failed to fetch auctions." },
        { status: 500 }
      );
    }

    // Filter to matching lead types (advisor type matches lead type)
    // or show all if no type filter needed
    const matchingAuctions = (auctions || []).filter((a) => {
      // Broad match: advisor type contains or matches lead type
      if (!a.lead_type) return true;
      return a.lead_type.toLowerCase().includes(advisor.type?.toLowerCase() || "");
    });

    // For each auction, fetch the current high bid and advisor's own bid
    const enrichedAuctions = await Promise.all(
      matchingAuctions.map(async (auction) => {
        const { data: bids } = await admin
          .from("advisor_auction_bids")
          .select("id, bid_amount, advisor_id")
          .eq("auction_id", auction.id)
          .eq("status", "active")
          .order("bid_amount", { ascending: false })
          .limit(5);

        const highBid = bids?.[0]?.bid_amount ?? null;
        const bidCount = bids?.length ?? 0;
        const myBid = bids?.find((b) => b.advisor_id === advisor.id);

        return {
          ...auction,
          high_bid_cents: highBid,
          bid_count: bidCount,
          my_bid_cents: myBid?.bid_amount ?? null,
          my_bid_id: myBid?.id ?? null,
          is_leading: myBid ? myBid.id === bids?.[0]?.id : false,
        };
      })
    );

    // Also fetch won auctions for this advisor
    const { data: wonBids } = await admin
      .from("advisor_auction_bids")
      .select(`
        id,
        bid_amount,
        auction_id,
        advisor_auctions!inner (
          id,
          lead_id,
          lead_type,
          location,
          budget_range,
          status,
          ends_at
        )
      `)
      .eq("advisor_id", advisor.id)
      .eq("status", "won");

    return NextResponse.json({
      active: enrichedAuctions,
      won: wonBids || [],
    });
  } catch (err) {
    log.error("Get auctions error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to fetch auctions." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return createAuction(request);
}

export async function GET(request: NextRequest) {
  return getAuctions(request);
}

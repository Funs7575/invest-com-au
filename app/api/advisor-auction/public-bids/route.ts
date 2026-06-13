import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { auctionRoundsEnabled } from "@/lib/auction-rounds";

const log = logger("advisor-auction:public-bids");

/**
 * GET /api/advisor-auction/public-bids
 * Returns the authenticated advisor's bids on public quote requests.
 *
 * DELETE /api/advisor-auction/public-bids?bid_id=X
 * Retracts a pending bid (sets status to "retracted").
 */

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`pub-bids-get:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const admin = createAdminClient();

    const { data: advisor } = await admin
      .from("professionals")
      .select("id")
      .eq("email", user.email)
      .eq("status", "active")
      .single();

    if (!advisor) return NextResponse.json({ error: "Advisor profile not found." }, { status: 404 });

    // Fetch bids placed by this advisor on public jobs, joining the auction for context
    const { data: bids, error } = await admin
      .from("advisor_auction_bids")
      .select(`
        id,
        bid_amount,
        status,
        created_at,
        advisor_auctions!inner (
          id,
          slug,
          job_title,
          budget_band,
          location,
          status,
          ends_at,
          winning_bid_id,
          source
        )
      `)
      .eq("advisor_id", advisor.id)
      .eq("advisor_auctions.source", "public_job")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      log.error("Failed to fetch public bids", { error: error.message });
      return NextResponse.json({ error: "Failed to fetch bids." }, { status: 500 });
    }

    const baseBids = (bids || []) as Array<Record<string, unknown>>;

    // Idea #11 — enrich with counter / round fields in a SEPARATE, fail-soft
    // query (only when the flag is on) so the base list never breaks if the
    // columns are absent. Lets the portal surface a "respond to counter" action.
    if (baseBids.length > 0 && (await auctionRoundsEnabled(user.email))) {
      try {
        const ids = baseBids.map((b) => b.id as number);
        const { data: extra } = await admin
          .from("advisor_auction_bids")
          .select("id, counter_status, counter_amount, round_number")
          .in("id", ids);
        const byId = new Map(
          (extra ?? []).map((e) => [e.id as number, e as Record<string, unknown>]),
        );
        for (const b of baseBids) {
          const e = byId.get(b.id as number);
          b.counter_status = e?.counter_status ?? null;
          b.counter_amount = e?.counter_amount ?? null;
          b.round_number = e?.round_number ?? 1;
        }
      } catch (err) {
        log.warn("Counter/round enrichment failed (dormant)", {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ bids: baseBids });
  } catch (err) {
    log.error("Public bids GET error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to fetch bids." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`pub-bids-delete:${ip}`, 20, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const bidId = Number(request.nextUrl.searchParams.get("bid_id"));
    if (!bidId || isNaN(bidId)) {
      return NextResponse.json({ error: "bid_id is required." }, { status: 400 });
    }

    const VALID_REASONS = new Set([
      "schedule_conflict",
      "already_booked",
      "outside_expertise",
      "other",
    ]);
    const reasonRaw = request.nextUrl.searchParams.get("reason") ?? "";
    const retractReason = VALID_REASONS.has(reasonRaw) ? reasonRaw : null;

    const admin = createAdminClient();

    const { data: advisor } = await admin
      .from("professionals")
      .select("id")
      .eq("email", user.email)
      .eq("status", "active")
      .single();

    if (!advisor) return NextResponse.json({ error: "Advisor profile not found." }, { status: 404 });

    // Verify the bid belongs to this advisor and is on a public job
    const { data: bid } = await admin
      .from("advisor_auction_bids")
      .select("id, status, auction_id, advisor_auctions!inner(source, status)")
      .eq("id", bidId)
      .eq("advisor_id", advisor.id)
      .maybeSingle();

    if (!bid) return NextResponse.json({ error: "Bid not found." }, { status: 404 });

    const auctionData = bid.advisor_auctions as unknown as { source: string; status: string } | null;
    const auctionSource = auctionData?.source;
    const auctionStatus = auctionData?.status;

    if (auctionSource !== "public_job") {
      return NextResponse.json({ error: "Can only retract bids on public quote requests." }, { status: 400 });
    }
    if (bid.status !== "active") {
      return NextResponse.json({ error: "Only active bids can be retracted." }, { status: 400 });
    }
    if (auctionStatus !== "open") {
      return NextResponse.json({ error: "The job is no longer open." }, { status: 400 });
    }

    await admin
      .from("advisor_auction_bids")
      .update({ status: "retracted", retract_reason: retractReason })
      .eq("id", bidId);

    log.info("Public bid retracted", { bidId, advisorId: advisor.id, retractReason });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Public bids DELETE error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to retract bid." }, { status: 500 });
  }
}

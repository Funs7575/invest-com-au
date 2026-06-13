import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { StartFinalRoundRequest } from "@/lib/api-schemas";
import {
  auctionRoundsEnabled,
  finalRoundActive,
  FINAL_ROUND_MS,
  MAX_FINAL_ROUND_BIDS,
} from "@/lib/auction-rounds";
import { sendFinalRoundInviteEmail } from "@/lib/quote-emails";

const log = logger("quotes:final-round");

/**
 * POST /api/quotes/[slug]/final-round — Consumer opens ONE 24h best-and-final
 * round among up to 3 chosen bids (idea #11).
 *
 * Auth: email-as-key (same model as accept). Flag-gated by `auction_rounds`;
 * with the flag off this 404s so the mechanic is fully dormant.
 *
 * The chosen bids are bumped to round_number=2 — that doubles as the "invited"
 * flag and the "round-2 marked" signal the consumer sees. Invited advisers may
 * then submit one revised bid via the existing bid route while the window is
 * open. The auction-close cron settles the window when final_round_ends_at < now.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`quote-final-round:${ip}`, 10, 60)) {
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

    const parsed = StartFinalRoundRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request body." },
        { status: 400 },
      );
    }
    const { contact_email, bid_ids } = parsed.data;

    const admin = createAdminClient();

    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id, slug, job_title, contact_email, status, final_round_started_at, final_round_ends_at")
      .eq("slug", slug)
      .eq("is_public", true)
      .eq("source", "public_job")
      .maybeSingle();

    if (!auction) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    // Flag-gate AFTER load so we can key the rollout by the owner email. Fail
    // closed: 404 keeps the feature invisible when off.
    if (!(await auctionRoundsEnabled(auction.contact_email as string | null))) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if ((auction.contact_email as string)?.toLowerCase() !== contact_email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Verification failed." }, { status: 403 });
    }

    if (auction.status !== "open") {
      return NextResponse.json({ error: "This job is no longer open." }, { status: 400 });
    }

    // One round only. If a window is already live (or was already run), refuse.
    if (auction.final_round_started_at || finalRoundActive(auction)) {
      return NextResponse.json(
        { error: "A best-and-final round has already been started for this request." },
        { status: 409 },
      );
    }

    const chosen = bid_ids.slice(0, MAX_FINAL_ROUND_BIDS);

    // Only active bids actually on THIS auction are eligible.
    const { data: bids } = await admin
      .from("advisor_auction_bids")
      .select("id, advisor_id, bid_amount, status")
      .eq("auction_id", auction.id)
      .in("id", chosen)
      .eq("status", "active");

    const eligible = bids ?? [];
    if (eligible.length === 0) {
      return NextResponse.json(
        { error: "None of the selected quotes are still available for a final round." },
        { status: 400 },
      );
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + FINAL_ROUND_MS);

    const { error: auctionErr } = await admin
      .from("advisor_auctions")
      .update({
        final_round_started_at: startedAt.toISOString(),
        final_round_ends_at: endsAt.toISOString(),
      })
      .eq("id", auction.id)
      .eq("status", "open");

    if (auctionErr) {
      log.error("Failed to open final round", { err: auctionErr.message, auctionId: auction.id });
      return NextResponse.json({ error: "Failed to start the final round." }, { status: 500 });
    }

    // Mark the chosen bids as round 2 — the "invited" + "marked" signal.
    const chosenIds = eligible.map((b) => b.id);
    await admin
      .from("advisor_auction_bids")
      .update({ round_number: 2 })
      .in("id", chosenIds);

    // Email the invited advisers (fire-and-forget; never block the response).
    const advisorIds = eligible.map((b) => b.advisor_id);
    const { data: advisors } = await admin
      .from("professionals")
      .select("id, name, email")
      .in("id", advisorIds);

    const advisorById = new Map(
      (advisors ?? []).map((a) => [a.id as number, a as { id: number; name: string; email: string | null }]),
    );

    for (const bid of eligible) {
      const adv = advisorById.get(bid.advisor_id);
      if (!adv?.email) continue;
      const firstName = (adv.name ?? "").trim().split(" ")[0] || adv.name || "there";
      sendFinalRoundInviteEmail(
        adv.email,
        firstName,
        (auction.job_title as string | null) ?? "your quote request",
        auction.slug as string,
        bid.bid_amount as number,
        endsAt.toISOString(),
      ).catch((err) =>
        log.warn("Final-round invite email failed", {
          advisorId: bid.advisor_id,
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    log.info("Final round opened", {
      auctionId: auction.id,
      invited: chosenIds.length,
      endsAt: endsAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      final_round_ends_at: endsAt.toISOString(),
      invited: chosenIds.length,
    });
  } catch (err) {
    log.error("Final round error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to start the final round." }, { status: 500 });
  }
}

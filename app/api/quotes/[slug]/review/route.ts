import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("quotes:review");

const ReviewSubmit = z.object({
  token: z.string().min(8).max(128),
  reviewer_email: z.string().email("A valid email is required."),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
  reviewer_display_name: z.string().min(1).max(80).optional(),
});

function expectedToken(auctionId: number, email: string): string {
  const secret = process.env.CRON_SECRET ?? "";
  return createHmac("sha256", secret)
    .update(`${auctionId}|${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * POST /api/quotes/[slug]/review — Submit a review for the winning advisor.
 *
 * Auth: short-lived HMAC token mailed to the consumer 14 days post-accept
 * (see /api/cron/quote-review-requests). Token is bound to (auction_id, email),
 * so it can only review the auction it was minted for and only by that owner.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`quote-review:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = ReviewSubmit.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body." }, { status: 400 });
    }
    const { token, reviewer_email, rating, body, reviewer_display_name } = parsed.data;

    const admin = createAdminClient();

    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id, contact_email, winning_bid_id")
      .eq("slug", slug)
      .eq("source", "public_job")
      .maybeSingle();

    if (!auction) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    if (!auction.winning_bid_id) {
      return NextResponse.json({ error: "No accepted quote on this job." }, { status: 400 });
    }
    if ((auction.contact_email as string)?.toLowerCase() !== reviewer_email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Email does not match." }, { status: 403 });
    }

    const expected = expectedToken(auction.id as number, reviewer_email);
    if (!tokensMatch(token, expected)) {
      return NextResponse.json({ error: "Invalid or expired review link." }, { status: 403 });
    }

    const { data: bid } = await admin
      .from("advisor_auction_bids")
      .select("advisor_id")
      .eq("id", auction.winning_bid_id)
      .maybeSingle();
    if (!bid) return NextResponse.json({ error: "Winning bid not found." }, { status: 404 });

    const advisorId = bid.advisor_id as number;

    const { error: insErr } = await admin.from("quote_reviews").insert({
      auction_id: auction.id,
      advisor_id: advisorId,
      reviewer_email: reviewer_email.toLowerCase().trim(),
      reviewer_display_name: reviewer_display_name?.trim() ?? null,
      rating,
      body: body?.trim() || null,
      verified: true,
    });

    if (insErr) {
      // 23505 = unique violation (already reviewed)
      const code = (insErr as { code?: string }).code;
      if (code === "23505") {
        return NextResponse.json({ error: "You have already reviewed this advisor." }, { status: 409 });
      }
      log.error("Review insert failed", { err: insErr.message });
      return NextResponse.json({ error: "Failed to save review." }, { status: 500 });
    }

    log.info("Review submitted", { auctionId: auction.id, advisorId, rating });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Review POST error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to save review." }, { status: 500 });
  }
}

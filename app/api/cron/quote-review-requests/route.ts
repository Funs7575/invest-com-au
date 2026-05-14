import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { sendQuoteReviewRequestEmail } from "@/lib/quote-emails";
import { createHmac } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron-quote-review-requests");

/**
 * Mints a deterministic, signature-verifiable token for the review form.
 * The /quotes/[slug]/review page validates token == hmac(secret, auction_id|email).
 */
function makeReviewToken(auctionId: number, email: string): string {
  const secret = process.env.CRON_SECRET ?? "";
  return createHmac("sha256", secret)
    .update(`${auctionId}|${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Cron: 14-day post-engagement review request.
 *
 * Runs daily. Picks awarded auctions where winning_bid_id is set,
 * the bid was accepted ≥14 days ago, and review_request_sent_at is null.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 14 * 86400_000).toISOString();

  const { data: jobs, error } = await admin
    .from("advisor_auctions")
    .select("id, slug, job_title, contact_email, contact_name, winning_bid_id, updated_at")
    .eq("source", "public_job")
    .eq("flow_type", "auction")
    .not("winning_bid_id", "is", null)
    .is("review_request_sent_at", null)
    .lte("updated_at", cutoff)
    .limit(200);

  if (error) {
    log.error("Failed to fetch awarded jobs", { err: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const job of jobs || []) {
    if (!job.contact_email || !job.winning_bid_id) {
      skipped++;
      continue;
    }

    const { data: bid } = await admin
      .from("advisor_auction_bids")
      .select("advisor_id")
      .eq("id", job.winning_bid_id)
      .maybeSingle();

    if (!bid) {
      skipped++;
      continue;
    }

    const { data: advisor } = await admin
      .from("professionals")
      .select("name")
      .eq("id", bid.advisor_id)
      .maybeSingle();

    if (!advisor) {
      skipped++;
      continue;
    }

    const firstName =
      (job.contact_name as string | null)?.trim().split(" ")[0] ||
      (job.contact_name as string | null) ||
      "there";

    const token = makeReviewToken(job.id as number, job.contact_email as string);

    const ok = await sendQuoteReviewRequestEmail(
      job.contact_email as string,
      firstName,
      advisor.name as string,
      job.job_title as string,
      job.slug as string,
      token,
    );

    await admin
      .from("advisor_auctions")
      .update({ review_request_sent_at: new Date().toISOString() })
      .eq("id", job.id);

    if (ok) sent++;
    else skipped++;
  }

  log.info("Review requests processed", { sent, skipped, scanned: jobs?.length ?? 0 });
  return NextResponse.json({ sent, skipped, scanned: jobs?.length ?? 0 });
}

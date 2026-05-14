import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { sendQuoteExpiryReminderEmail } from "@/lib/quote-emails";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron-quote-expiry-reminders");

/**
 * Cron: 24h-before-expiry reminder for open public quote requests.
 *
 * Runs hourly. Picks open public_job auctions whose ends_at is in the
 * next ~26 hours, hasn't already been reminded, and sends the consumer
 * a nudge with bid count and the lowest current bid.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const admin = createAdminClient();
  const now = new Date();
  const lower = new Date(now.getTime() + 22 * 3600_000).toISOString();
  const upper = new Date(now.getTime() + 26 * 3600_000).toISOString();

  const { data: jobs, error } = await admin
    .from("advisor_auctions")
    .select("id, slug, job_title, contact_email, contact_name, ends_at")
    .eq("source", "public_job")
    .eq("flow_type", "auction")
    .eq("is_public", true)
    .eq("status", "open")
    .is("expiry_reminder_sent_at", null)
    .gte("ends_at", lower)
    .lte("ends_at", upper)
    .limit(200);

  if (error) {
    log.error("Failed to fetch expiring jobs", { err: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const job of jobs || []) {
    if (!job.contact_email) {
      skipped++;
      continue;
    }

    const { data: bids } = await admin
      .from("advisor_auction_bids")
      .select("id, bid_amount, advisor_id")
      .eq("auction_id", job.id)
      .eq("status", "active")
      .order("bid_amount", { ascending: true });

    const bidCount = bids?.length ?? 0;
    if (bidCount === 0) {
      // No bids → don't bother nudging; mark to avoid re-checking next hour.
      await admin
        .from("advisor_auctions")
        .update({ expiry_reminder_sent_at: now.toISOString() })
        .eq("id", job.id);
      skipped++;
      continue;
    }

    const top = bids![0]!;
    const { data: advisor } = await admin
      .from("professionals")
      .select("name")
      .eq("id", top.advisor_id)
      .maybeSingle();

    const firstName =
      (job.contact_name as string | null)?.trim().split(" ")[0] ||
      (job.contact_name as string | null) ||
      "there";

    const ok = await sendQuoteExpiryReminderEmail(
      job.contact_email as string,
      firstName,
      job.job_title as string,
      job.slug as string,
      bidCount,
      Number(top.bid_amount),
      (advisor?.name as string | undefined) ?? null,
    );

    await admin
      .from("advisor_auctions")
      .update({ expiry_reminder_sent_at: now.toISOString() })
      .eq("id", job.id);

    if (ok) sent++;
    else skipped++;
  }

  log.info("Quote expiry reminders processed", { sent, skipped, scanned: jobs?.length ?? 0 });
  return NextResponse.json({ sent, skipped, scanned: jobs?.length ?? 0 });
}

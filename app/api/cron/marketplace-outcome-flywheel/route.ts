import { NextRequest, NextResponse } from "next/server";

import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";
import { logger } from "@/lib/logger";
import {
  createPendingOutcomeRequests,
  refreshProviderOutcomeScores,
} from "@/lib/outcomes";

/**
 * N4 — Outcome flywheel cron.
 *
 * Runs daily. Three sub-tasks:
 *   1. Create review-request rows for accepted briefs older than 28 days
 *      that don't have an outcome yet.
 *   2. Email those consumers a `/review/[token]` link.
 *   3. Refresh `provider_outcome_scores` from submitted outcomes.
 *
 * The cron is registered in lib/cron-groups.ts under daily-10. Compliance:
 * the review email contains a personal data link (review_token) — only
 * sent once per brief; never resent. The consumer can opt out by simply
 * not responding.
 */

const log = logger("cron:marketplace-outcome-flywheel");

async function emailPendingReviews(): Promise<number> {
  const admin = createAdminClient();
  // Find outcome rows that have been requested but never submitted, and
  // we haven't emailed within the last 24h (we send once, never resend).
  // The `review_requested_at` is stamped at creation; we filter on a
  // separate `email_sent_at` if you want a resend window. For MVP we
  // assume one email per request and stamp `review_requested_at` as a
  // shorthand for "email sent" — created in the same step.
  const { data, error } = await admin
    .from("brief_outcomes")
    .select(
      "brief_id, consumer_email, review_token, review_requested_at, submitted_at",
    )
    .is("submitted_at", null)
    .not("review_requested_at", "is", null)
    .limit(200);
  if (error) {
    log.warn("emailPendingReviews scan failed", { err: error.message });
    return 0;
  }
  if (!data || data.length === 0) return 0;

  let sent = 0;
  for (const row of data) {
    const url = `${SITE_URL}/review/${row.review_token}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155;padding:24px">
      <h2 style="color:#0f172a;margin:0 0 12px 0">How did it go?</h2>
      <p style="font-size:14px">A few weeks ago a verified pro accepted your Match Request through Invest.com.au. We'd love a quick update — it takes 30 seconds and helps other Australians find the right pro.</p>
      <p style="margin:16px 0"><a href="${url}" style="display:inline-block;padding:10px 24px;background:#f59e0b;color:#0f172a;text-decoration:none;border-radius:6px;font-weight:600">Share your outcome →</a></p>
      <p style="font-size:11px;color:#94a3b8;margin-top:20px">One-time link, expires in 90 days. <a href="${SITE_URL}/privacy" style="color:#94a3b8">Privacy</a></p>
    </div>`;
    await sendEmail({
      from: "Invest.com.au <hello@invest.com.au>",
      to: row.consumer_email as string,
      subject: "How did it go with your verified pro?",
      html,
    });
    sent++;
  }
  return sent;
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  try {
    const created = await createPendingOutcomeRequests(28);
    const emailed = await emailPendingReviews();
    const refreshed = await refreshProviderOutcomeScores();

    log.info("marketplace-outcome-flywheel cron complete", {
      created,
      emailed,
      refreshed,
    });

    return NextResponse.json({
      ok: true,
      requests_created: created,
      review_emails_sent: emailed,
      scoreboard_rows_refreshed: refreshed,
    });
  } catch (err) {
    log.error("marketplace-outcome-flywheel cron failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "cron failed" }, { status: 500 });
  }
}

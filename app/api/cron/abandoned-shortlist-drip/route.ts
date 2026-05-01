import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import { sendEmail } from "@/lib/resend";

const log = logger("cron:abandoned-shortlist-drip");

export const runtime = "nodejs";
export const maxDuration = 120;

const DRIP_TYPE = "abandoned_shortlist";
const MIN_SHORTLIST_AGE_DAYS = 3;
const MIN_SHORTLIST_COUNT = 2;
const MAX_BATCH = 500;

/**
 * Daily cron — re-engages signed-in users who saved 2+ brokers to
 * their personal shortlist 3+ days ago and never came back to compare
 * or click through.
 *
 * Recovery criteria:
 *   1. user_shortlisted_brokers has ≥2 rows for the user.
 *   2. The OLDEST row for that user is at least 3 days old.
 *   3. The user has a profiles.email we can mail.
 *   4. We haven't already sent this email (investor_drip_log row with
 *      drip_type='abandoned_shortlist').
 *   5. Email is not in email_suppression_list and not bounced in
 *      email_captures.
 *
 * Idempotency: a row in investor_drip_log with drip_type='abandoned_shortlist'
 * is written before stats.sent is incremented, so a same-day re-run
 * never double-sends. Each user is mailed at most once per shortlist
 * lifecycle (re-mailing after a fresh shortlist would require clearing
 * the drip log row, which is intentional).
 *
 * NOTE on click-suppression: affiliate_clicks has no user_id column —
 * clicks are correlated by ip_hash + session_id only, neither of
 * which is on user_shortlisted_brokers. We therefore rely on the
 * drip-log dedup + the 3-day idle threshold rather than a "no clicks
 * since" filter. If/when affiliate_clicks gains a user_id column,
 * extend this cron to skip users with a click in the relevant window.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("abandoned_shortlist_drip")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  if (!process.env.RESEND_API_KEY) {
    log.warn("RESEND_API_KEY not set — exiting cron without sends");
    return NextResponse.json({ ok: true, skipped: "no_resend_api_key" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const stats = {
    considered: 0,
    sent: 0,
    skipped: 0,
    suppressed: 0,
    already_sent: 0,
    no_email: 0,
    errors: 0,
  };

  const cutoffIso = new Date(
    now.getTime() - MIN_SHORTLIST_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Step 1 — pull recent shortlist rows. We over-fetch on purpose so we
  // can compute "user has ≥2 entries AND oldest is ≥3 days old" in
  // memory; this avoids relying on a server-side aggregate that the
  // PostgREST client can't easily express. Limit caps blast radius.
  const { data: rows, error } = await supabase
    .from("user_shortlisted_brokers")
    .select("user_id, broker_slug, added_at")
    .order("added_at", { ascending: true })
    .limit(5000);

  if (error) {
    log.error("Failed to fetch user_shortlisted_brokers", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  // Group by user_id → { count, oldestAddedAt, slugs[] }
  interface UserShortlist {
    count: number;
    oldestAddedAt: string;
    slugs: string[];
  }
  const byUser = new Map<string, UserShortlist>();
  for (const r of rows || []) {
    const userId = r.user_id as string | null;
    const slug = r.broker_slug as string | null;
    const addedAt = r.added_at as string | null;
    if (!userId || !slug || !addedAt) continue;
    const existing = byUser.get(userId);
    if (existing) {
      existing.count++;
      if (addedAt < existing.oldestAddedAt) existing.oldestAddedAt = addedAt;
      if (existing.slugs.length < 8) existing.slugs.push(slug);
    } else {
      byUser.set(userId, { count: 1, oldestAddedAt: addedAt, slugs: [slug] });
    }
  }

  // Filter: ≥2 brokers AND oldest is ≥3 days old.
  const eligibleUserIds: string[] = [];
  for (const [userId, info] of byUser) {
    if (info.count >= MIN_SHORTLIST_COUNT && info.oldestAddedAt <= cutoffIso) {
      eligibleUserIds.push(userId);
    }
  }
  stats.considered = eligibleUserIds.length;

  if (eligibleUserIds.length === 0) {
    log.info("abandoned shortlist drip — no eligible users", stats);
    return NextResponse.json({ ok: true, ...stats });
  }

  // Cap batch to keep within maxDuration on cold runs with a backlog.
  const batch = eligibleUserIds.slice(0, MAX_BATCH);

  // Step 2 — resolve user_id → email via profiles.
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", batch);

  if (profilesErr) {
    log.error("Failed to fetch profiles", { error: profilesErr.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const userIdToEmail = new Map<string, string>();
  for (const p of profiles || []) {
    const id = p.id as string | null;
    const email = p.email as string | null;
    if (!id || !email) continue;
    userIdToEmail.set(id, email.toLowerCase());
  }
  stats.no_email = batch.length - userIdToEmail.size;

  if (userIdToEmail.size === 0) {
    log.info("abandoned shortlist drip — eligible users had no email", stats);
    return NextResponse.json({ ok: true, ...stats });
  }

  const emails = Array.from(new Set(userIdToEmail.values()));

  // Step 3 — pull suppression list, bounced captures, and prior sends in
  // bulk so the per-user loop is O(1) lookups.
  const [suppressedRes, bouncedRes, priorSendsRes] = await Promise.all([
    supabase.from("email_suppression_list").select("email"),
    supabase
      .from("email_captures")
      .select("email")
      .eq("status", "bounced")
      .in("email", emails),
    supabase
      .from("investor_drip_log")
      .select("email")
      .eq("drip_type", DRIP_TYPE)
      .in("email", emails),
  ]);

  const suppressedSet = new Set(
    (suppressedRes.data || []).map((r) => (r.email as string).toLowerCase()),
  );
  for (const r of bouncedRes.data || []) {
    suppressedSet.add((r.email as string).toLowerCase());
  }
  const alreadySentSet = new Set(
    (priorSendsRes.data || []).map((r) => (r.email as string).toLowerCase()),
  );

  // Step 4 — for each eligible user, send and log. Per-user errors do
  // NOT abort the run.
  for (const userId of batch) {
    const email = userIdToEmail.get(userId);
    if (!email) continue;
    const info = byUser.get(userId);
    if (!info) continue;

    if (suppressedSet.has(email)) {
      stats.suppressed++;
      continue;
    }
    if (alreadySentSet.has(email)) {
      stats.already_sent++;
      continue;
    }

    try {
      const subject = "You saved a few brokers — ready to compare?";
      const html = renderEmail(email, info.slugs);
      const result = await sendEmail({
        to: email,
        subject,
        from: "Invest.com.au <hello@invest.com.au>",
        html,
      });

      if (!result.ok) {
        stats.errors++;
        log.warn("send failed", { userId, error: result.error });
        continue;
      }

      // Log the send AFTER a successful Resend call so a transient
      // Resend failure doesn't permanently mark the user as sent.
      const { error: logErr } = await supabase.from("investor_drip_log").insert({
        email,
        drip_number: 1,
        drip_type: DRIP_TYPE,
        sent_at: now.toISOString(),
      });
      if (logErr) {
        // Logging failure is recoverable — the email already shipped,
        // so we WARN rather than ERROR. Worst case the user gets a
        // duplicate next run; better than blocking the cron.
        log.warn("Failed to write investor_drip_log row", {
          userId,
          error: logErr.message,
        });
      }

      // Add to the in-memory dedupe set so the SAME run doesn't
      // re-send if a user appears twice (shouldn't, but defensive).
      alreadySentSet.add(email);
      stats.sent++;
    } catch (err) {
      stats.errors++;
      log.error("abandoned shortlist drip per-user failure", {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  stats.skipped =
    eligibleUserIds.length -
    stats.sent -
    stats.suppressed -
    stats.already_sent -
    stats.errors -
    stats.no_email;

  log.info("abandoned shortlist drip completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

function renderEmail(email: string, slugs: string[]): string {
  const siteUrl = getSiteUrl();
  const ctaUrl = `${siteUrl}/shortlist?utm_source=email&utm_campaign=abandoned-shortlist`;
  const slugList = slugs
    .slice(0, 5)
    .map((s) => `<li style="margin:4px 0">${escapeHtml(s)}</li>`)
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;font-size:18px">Picking up where you left off</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        A few days ago you shortlisted these brokers on Invest.com.au:
      </p>
      <ul style="color:#334155;font-size:14px;line-height:1.6;padding-left:20px">
        ${slugList}
      </ul>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Open your shortlist for a side-by-side fee, feature and rating
        comparison — it takes about 30 seconds.
      </p>
      <p style="margin:24px 0">
        <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Compare my shortlist →</a>
      </p>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px">
        You're receiving this because you saved brokers to your shortlist while signed in to Invest.com.au.
        <a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>`;
}

export const GET = wrapCronHandler("abandoned-shortlist-drip", handler);

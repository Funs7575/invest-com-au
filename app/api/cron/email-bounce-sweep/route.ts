import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";

const log = logger("cron:email-bounce-sweep");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily cron that reconciles the email_suppression_list with the
 * Resend bounce/complaint feed.
 *
 * When a send generates a hard bounce or complaint, Resend delivers
 * a webhook to /api/resend-webhook (if wired up). This cron is the
 * backstop for:
 *
 *   1. Pulling bounces from the Resend API for any period the
 *      webhook missed (e.g. first-time setup backfill)
 *   2. Scrubbing any drip sequences that reference a now-suppressed
 *      email address so we don't keep trying to reach dead mailboxes
 *   3. Flagging leads with hard-bounced contact emails so the
 *      advisor's auto-refund flow can kick in
 *
 * Without RESEND_API_KEY this cron is a safe no-op — it still
 * scrubs drips for whatever is ALREADY in email_suppression_list,
 * so manual adds to the suppression table still take effect.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const stats = {
    pulled_from_resend: 0,
    leads_flagged: 0,
    drips_scrubbed: 0,
    errored: 0,
  };

  // ── 1. Pull latest bounces from Resend ──────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      // Resend's API exposes /emails with a filter for bounced status.
      // Pagination handled by `limit` + `after`.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `https://api.resend.com/emails?limit=100&status=bounced&since=${since}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (res.ok) {
        const body = (await res.json()) as {
          data?: Array<{ to?: string[]; bounce_type?: string }>;
        };
        for (const email of body.data || []) {
          for (const to of email.to || []) {
            const normalized = to.toLowerCase();
            const reason =
              email.bounce_type === "hard" || email.bounce_type === "permanent"
                ? "hard_bounce"
                : "soft_bounce_repeated";
            await supabase
              .from("email_suppression_list")
              .upsert(
                {
                  email: normalized,
                  reason,
                  source: "cron",
                  bounce_count: 1,
                  last_seen_at: new Date().toISOString(),
                },
                { onConflict: "email" },
              );
            stats.pulled_from_resend++;
          }
        }
      } else {
        log.warn("Resend bounce pull non-OK", { status: res.status });
      }
    } catch (err) {
      stats.errored++;
      log.error("Resend bounce pull threw", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 2. Scrub active drip sequences ──────────────────────────────
  // Walk the suppression list and mark any leads / advisors / broker
  // accounts pointed at a suppressed email so downstream crons skip
  // them instead of hammering dead mailboxes.
  const { data: suppressed } = await supabase
    .from("email_suppression_list")
    .select("email")
    .limit(1000);

  const suppressedEmails = (suppressed || []).map((r) => r.email);

  if (suppressedEmails.length > 0) {
    // Flag any unbilled leads with bounced contact emails → lets
    // the lead-dispute cron auto-refund them under the unreachable rule
    const { error: leadErr } = await supabase
      .from("professional_leads")
      .update({ outcome: "email_bounced" })
      .in("user_email", suppressedEmails)
      .is("outcome", null);
    if (leadErr) {
      log.warn("Lead flag step failed", { error: leadErr.message });
    } else {
      // count via a separate select — Supabase JS client can't return affected rows
      const { count } = await supabase
        .from("professional_leads")
        .select("id", { count: "exact", head: true })
        .in("user_email", suppressedEmails)
        .eq("outcome", "email_bounced");
      stats.leads_flagged = count || 0;
    }

    // Remove the suppressed emails from any active drip sequences
    // (investor_drip_log uses email as key)
    try {
      const { count: scrubbed } = await supabase
        .from("investor_drip_log")
        .delete({ count: "exact" })
        .in("email", suppressedEmails);
      stats.drips_scrubbed = scrubbed || 0;
    } catch (err) {
      // Table may not exist in every environment — don't fail the cron
      log.warn("Drip scrub step failed (non-fatal)", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Email bounce sweep completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

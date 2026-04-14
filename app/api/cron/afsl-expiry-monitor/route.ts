import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { lookupAfsl } from "@/lib/advisor-application-resolver";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { ADMIN_EMAIL } from "@/lib/admin";

const log = logger("cron:afsl-expiry-monitor");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Weekly cron that re-checks every active advisor's AFSL against
 * the ASIC Financial Services Register and flags:
 *
 *   - Licences that have been ceased / suspended since last check
 *     (auto-pause advisor, email both advisor and admin)
 *   - Licences that are still current (no action, just log)
 *
 * Uses the same lookupAfsl() helper as the auto-verification flow,
 * so when the user configures AFSL_LOOKUP_URL env var, this cron
 * starts running real checks. Without that env var, lookupAfsl
 * returns performed: false and the cron is a safe no-op.
 *
 * Runs weekly because the register doesn't change daily and we
 * don't want to hammer it. Vercel cron schedule: '0 3 * * 1' (Mon 3am).
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  const { data: advisors, error } = await supabase
    .from("professionals")
    .select("id, name, email, afsl_number, type, status")
    .eq("status", "active")
    .not("afsl_number", "is", null)
    .limit(5000);

  if (error) {
    log.error("Failed to fetch advisors", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const stats = {
    scanned: advisors?.length || 0,
    lookups_run: 0,
    still_current: 0,
    flagged_ceased: 0,
    flagged_suspended: 0,
    skipped_no_lookup: 0,
    errored: 0,
  };

  for (const advisor of advisors || []) {
    try {
      const result = await lookupAfsl(advisor.afsl_number);
      if (!result.performed) {
        stats.skipped_no_lookup++;
        continue;
      }
      stats.lookups_run++;

      if (result.status === "current") {
        stats.still_current++;
        continue;
      }

      if (result.status === "ceased" || result.status === "suspended") {
        // Auto-pause + notify
        await supabase
          .from("professionals")
          .update({
            status: "paused",
            auto_paused_at: new Date().toISOString(),
            auto_pause_reason: `afsl_${result.status}`,
          })
          .eq("id", advisor.id);

        sendEmail(
          advisor.email,
          `Your advisor profile has been paused — AFSL ${result.status}`,
          `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
            <h2 style="color:#dc2626;font-size:18px">AFSL ${result.status} on the ASIC register</h2>
            <p style="font-size:14px">Hi ${escapeHtml(advisor.name || "there")},</p>
            <p style="font-size:14px">Our weekly check against the ASIC Financial Services Register shows that AFSL ${advisor.afsl_number} is currently marked as <strong>${result.status}</strong>.</p>
            <p style="font-size:14px">Your advisor profile has been paused until the licence is reinstated. If this is a register data error, please contact us immediately.</p>
            <a href="${getSiteUrl()}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Advisor portal →</a>
          </div>`,
        );

        sendEmail(
          ADMIN_EMAIL,
          `⚠️ AFSL ${result.status}: ${advisor.name}`,
          `<p>${escapeHtml(advisor.name || "advisor")} (AFSL ${advisor.afsl_number}) has been auto-paused after the ASIC register marked their licence as ${result.status}.</p>`,
        );

        if (result.status === "ceased") stats.flagged_ceased++;
        else stats.flagged_suspended++;
      }
    } catch (err) {
      stats.errored++;
      log.error("AFSL expiry check threw", {
        advisorId: advisor.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("AFSL expiry monitor completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

function sendEmail(to: string | null, subject: string, html: string): void {
  if (!to || !process.env.RESEND_API_KEY) return;
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <compliance@invest.com.au>",
      to: [to],
      subject,
      html,
    }),
  }).catch(() => {});
}

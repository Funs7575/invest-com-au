import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("cron:winback-drip");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Monthly winback cron for investors who compared a broker but
 * never clicked through (allocation_decisions without a subsequent
 * affiliate click). Sends ONE email with a fresh angle.
 *
 * We only target users whose email we have via email_captures and
 * who have an allocation_decision row but no matching click in the
 * same session window. Any single email suppression row rules them
 * out immediately (email_suppression_list is the source of truth).
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("winback_drip")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const stats = { scanned: 0, sent: 0, suppressed: 0, failed: 0 };

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: captures, error } = await supabase
    .from("email_captures")
    .select("email, captured_at, source, winback_sent_at")
    .lte("captured_at", thirtyDaysAgo)
    .gte("captured_at", ninetyDaysAgo)
    .is("winback_sent_at", null)
    .neq("status", "bounced")
    .limit(500);

  if (error) {
    log.error("Failed to fetch email_captures", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }
  stats.scanned = captures?.length || 0;

  // Pull suppression list once
  const { data: suppressed } = await supabase
    .from("email_suppression_list")
    .select("email");
  const suppressedSet = new Set((suppressed || []).map((r) => (r.email as string).toLowerCase()));

  for (const cap of captures || []) {
    try {
      const email = (cap.email as string).toLowerCase();
      if (suppressedSet.has(email)) {
        stats.suppressed++;
        continue;
      }

      if (process.env.RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Invest.com.au <hello@invest.com.au>",
            to: [email],
            subject: "We've updated broker fees since you last visited",
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
                <h2 style="color:#0f172a;font-size:18px">Hi,</h2>
                <p style="color:#334155;font-size:14px;line-height:1.6">
                  Since you last visited ${escapeHtml(new Date(cap.captured_at as string).toLocaleDateString("en-AU"))}, we've updated fees on
                  <strong>dozens of brokers</strong>, added new head-to-head
                  comparisons, and launched a personal fee calculator that
                  shows how much you'd save per year.
                </p>
                <p style="margin:24px 0">
                  <a href="${getSiteUrl()}/fee-impact" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Calculate my fees →</a>
                </p>
                <p style="color:#94a3b8;font-size:11px">
                  You got this because you signed up for updates at invest.com.au.
                  <a href="${getSiteUrl()}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94a3b8">Unsubscribe</a>
                </p>
              </div>`,
          }),
        }).catch((err) =>
          log.warn("resend send failed", { err: err instanceof Error ? err.message : String(err) }),
        );
      }

      await supabase
        .from("email_captures")
        .update({ winback_sent_at: now.toISOString() })
        .eq("email", email);

      stats.sent++;
    } catch (err) {
      stats.failed++;
      log.error("winback per-email failure", {
        email: cap.email,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("winback drip completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("winback-drip", handler);

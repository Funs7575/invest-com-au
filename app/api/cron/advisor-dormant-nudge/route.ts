import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("cron:advisor-dormant-nudge");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Weekly cron: nudge advisors who haven't logged in, haven't
 * received a lead, or haven't acted on a pending lead for 30 / 60
 * days. Re-activates the passive half of the advisor base without
 * spending $0 on ads.
 *
 * Thresholds:
 *   - 30 days dormant → soft nudge "the directory has new features"
 *   - 60 days dormant → proactive "here's how other advisors are
 *                        winning leads" with a book-a-call CTA
 *   - 90 days dormant → stop; we don't want to spam
 *
 * Idempotency: stamps advisor_dormant_nudged_at so we only send
 * once per cycle.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("advisor_dormant_nudge")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const stats = {
    scanned: 0,
    nudged_30: 0,
    nudged_60: 0,
    skipped: 0,
    failed: 0,
  };

  // Fetch active advisors whose last signal of life is between
  // 30 and 90 days ago. Uses last_login_at if present, else created_at.
  const { data: advisors, error } = await supabase
    .from("professionals")
    .select("id, name, email, created_at, last_login_at, advisor_dormant_nudged_at, status")
    .eq("status", "active")
    .limit(5000);

  if (error) {
    log.error("Failed to fetch professionals", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  stats.scanned = advisors?.length || 0;

  for (const a of advisors || []) {
    try {
      const lastSignal = new Date(
        (a.last_login_at as string) || (a.created_at as string),
      ).getTime();
      const dormantDays = (now.getTime() - lastSignal) / (1000 * 60 * 60 * 24);
      const lastNudged = a.advisor_dormant_nudged_at
        ? new Date(a.advisor_dormant_nudged_at as string).getTime()
        : 0;
      const daysSinceNudge = (now.getTime() - lastNudged) / (1000 * 60 * 60 * 24);

      if (dormantDays > 90) {
        stats.skipped++;
        continue;
      }
      // Don't re-nudge within 14 days
      if (daysSinceNudge < 14) {
        stats.skipped++;
        continue;
      }

      if (dormantDays >= 60) {
        await sendDormantEmail(a.email as string, a.name as string | null, 60);
        stats.nudged_60++;
      } else if (dormantDays >= 30) {
        await sendDormantEmail(a.email as string, a.name as string | null, 30);
        stats.nudged_30++;
      } else {
        stats.skipped++;
        continue;
      }

      await supabase
        .from("professionals")
        .update({ advisor_dormant_nudged_at: now.toISOString() })
        .eq("id", a.id);
    } catch (err) {
      stats.failed++;
      log.error("dormant nudge per-advisor failure", {
        id: a.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("advisor dormant nudge completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

async function sendDormantEmail(email: string, name: string | null, tier: 30 | 60): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const subject =
    tier === 30
      ? "A few new features in the advisor portal"
      : "Thinking about you — here's how the top advisors are winning leads";
  const body =
    tier === 30
      ? `Hi ${escapeHtml(name || "there")}, we haven't seen you in the advisor portal for about a month. Since then we've shipped: live lead quality scores, an auto-resolve dispute flow, and a bulk lead response tool. Jump back in when you have a spare 5 minutes.`
      : `Hi ${escapeHtml(name || "there")}, it's been about two months. A quick observation: the advisors winning the most leads right now are the ones who reply within 2 hours and keep their profile completeness above 90%. If you'd like a profile review on a free 15-minute call, just reply to this email.`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="color:#334155;font-size:14px;line-height:1.6">${body}</p>
      <p style="margin:24px 0"><a href="${getSiteUrl()}/advisor-portal" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Open advisor portal →</a></p>
      <p style="color:#94a3b8;font-size:11px">Reply STOP to unsubscribe from operational emails.</p>
    </div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <advisors@invest.com.au>",
      to: [email],
      subject,
      html,
    }),
  }).catch((err) => log.warn("resend send failed", { err: err instanceof Error ? err.message : String(err) }));
}

export const GET = wrapCronHandler("advisor-dormant-nudge", handler);

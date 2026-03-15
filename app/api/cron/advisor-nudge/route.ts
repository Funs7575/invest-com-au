import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "edge";
export const maxDuration = 60;

const log = logger("cron-advisor-nudge");

/**
 * Cron: Advisor Nudge Emails (runs daily at 9am AEST)
 *
 * Sends a nudge to Gold/Silver advisors who have received leads
 * but haven't responded within 48 hours.
 * Also nudges advisors whose credit_balance_cents is running low (<1 lead fee).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    log.warn("RESEND_API_KEY not set — skipping nudge emails");
    return NextResponse.json({ success: true, skipped: true, reason: "No RESEND_API_KEY" });
  }

  const supabase = createAdminClient();
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const nudgeCooldown = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Don't nudge more than once/week

  // 1. Find Silver/Gold advisors with unactioned leads (no nudge in last 7 days)
  const { data: advisors, error } = await supabase
    .from("professionals")
    .select("id, name, email, advisor_tier, credit_balance_cents, last_lead_date, advisor_nudge_sent_at")
    .in("advisor_tier", ["silver", "gold"])
    .eq("status", "active")
    .not("email", "is", null)
    .lt("last_lead_date", twoDaysAgo)
    .not("last_lead_date", "is", null)
    .or(`advisor_nudge_sent_at.is.null,advisor_nudge_sent_at.lt.${nudgeCooldown}`);

  if (error) {
    log.error("Failed to fetch advisors for nudge", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!advisors || advisors.length === 0) {
    log.info("No advisors to nudge today");
    return NextResponse.json({ success: true, nudged: 0 });
  }

  let nudged = 0;
  const now = new Date().toISOString();

  for (const advisor of advisors) {
    const isLowBalance = (advisor.credit_balance_cents || 0) < 6000; // Less than 1 Gold-tier lead fee

    const subject = isLowBalance
      ? `⚠️ Your Invest.com.au credit balance is low`
      : `You have unreviewed leads — Invest.com.au`;

    const html = isLowBalance
      ? buildLowBalanceEmail(advisor.name)
      : buildUnreviewedLeadsEmail(advisor.name, advisor.advisor_tier);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Invest.com.au Advisors <advisors@invest.com.au>",
          to: [advisor.email],
          subject,
          html,
        }),
      });

      if (res.ok) {
        // Update nudge timestamp
        await supabase
          .from("professionals")
          .update({ advisor_nudge_sent_at: now })
          .eq("id", advisor.id);
        nudged++;
      } else {
        log.error("Resend error", { advisor_id: advisor.id, status: res.status });
      }
    } catch (err) {
      log.error("Failed to send nudge", {
        advisor_id: advisor.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info(`Nudge complete: ${nudged}/${advisors.length} advisors notified`);

  return NextResponse.json({ success: true, nudged, total: advisors.length });
}

function buildUnreviewedLeadsEmail(name: string, tier: string): string {
  const dashboardUrl = "https://invest.com.au/advisor-dashboard";
  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<h2 style="color:#1e293b;">Hi ${name},</h2>
<p style="color:#475569;">You have leads waiting for review in your Invest.com.au dashboard.</p>
<p style="color:#475569;">As a <strong>${tier.charAt(0).toUpperCase() + tier.slice(1)}</strong> advisor, responding within 24 hours significantly increases your conversion rate and match score.</p>
<a href="${dashboardUrl}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:white;font-weight:700;border-radius:8px;text-decoration:none;margin:16px 0;">Review Your Leads →</a>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">Invest.com.au · <a href="https://invest.com.au/advisor-dashboard/notifications" style="color:#94a3b8;">Manage notifications</a></p>
</body></html>`;
}

function buildLowBalanceEmail(name: string): string {
  const topUpUrl = "https://invest.com.au/advisor-dashboard/credits";
  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<h2 style="color:#1e293b;">Hi ${name},</h2>
<p style="color:#475569;">Your Invest.com.au credit balance is running low. Top up now to ensure you keep receiving qualified leads without interruption.</p>
<a href="${topUpUrl}" style="display:inline-block;padding:12px 28px;background:#f59e0b;color:#1e293b;font-weight:700;border-radius:8px;text-decoration:none;margin:16px 0;">Top Up Credits →</a>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">Invest.com.au · <a href="https://invest.com.au/advisor-dashboard/notifications" style="color:#94a3b8;">Manage notifications</a></p>
</body></html>`;
}

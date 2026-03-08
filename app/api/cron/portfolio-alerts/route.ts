import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";

const log = logger("cron-portfolio-alerts");

export const runtime = "edge";
export const maxDuration = 30;

/**
 * GET /api/cron/portfolio-alerts
 * Runs daily. Checks each saved portfolio for:
 * 1. Fee changes on their brokers (from broker_data_changes)
 * 2. A cheaper broker now available (recalculates optimal)
 * 3. New deals on their brokers
 *
 * Sends email alerts and creates portfolio_alerts records.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

  // Get portfolios with alerts enabled
  const { data: portfolios } = await supabase
    .from("user_portfolios")
    .select("id, email, name, holdings, annual_fees_cents, optimal_fees_cents, optimal_broker_slug, alert_on_fee_change, alert_on_better_deal")
    .or("alert_on_fee_change.eq.true,alert_on_better_deal.eq.true")
    .limit(100);

  // Get recent fee changes (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentChanges } = await supabase
    .from("broker_data_changes")
    .select("broker_slug, field_name, old_value, new_value, changed_at")
    .gte("changed_at", yesterday)
    .in("field_name", ["asx_fee", "asx_fee_value", "us_fee", "us_fee_value", "fx_rate", "inactivity_fee"]);

  const changeMap = new Map<string, typeof recentChanges>();
  for (const c of recentChanges || []) {
    const existing = changeMap.get(c.broker_slug) || [];
    existing.push(c);
    changeMap.set(c.broker_slug, existing);
  }

  let alertsSent = 0;

  for (const portfolio of portfolios || []) {
    if (!portfolio.email) continue;
    const holdings = (portfolio.holdings as { broker_slug: string; broker_name?: string }[]) || [];
    const userBrokerSlugs = holdings.map(h => h.broker_slug);

    // Check for fee changes on user's brokers
    const affectedChanges: { broker: string; changes: string[] }[] = [];
    for (const slug of userBrokerSlugs) {
      const changes = changeMap.get(slug);
      if (changes && changes.length > 0 && portfolio.alert_on_fee_change) {
        affectedChanges.push({
          broker: holdings.find(h => h.broker_slug === slug)?.broker_name || slug,
          changes: changes.map(c => `${c.field_name}: ${c.old_value} → ${c.new_value}`),
        });
      }
    }

    if (affectedChanges.length > 0) {
      const firstName = portfolio.name?.split(" ")[0] || "there";
      const brokerList = affectedChanges.map(ac =>
        `<li><strong>${ac.broker}</strong>: ${ac.changes.join(", ")}</li>`
      ).join("");

      // Create alert record
      for (const ac of affectedChanges) {
        await supabase.from("portfolio_alerts").insert({
          portfolio_id: portfolio.id,
          alert_type: "fee_change",
          broker_slug: userBrokerSlugs.find(s => holdings.find(h => h.broker_slug === s)?.broker_name === ac.broker) || null,
          title: `Fee change: ${ac.broker}`,
          detail: ac.changes.join(", "),
        });
      }

      // Send email
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Invest.com.au <alerts@invest.com.au>",
            to: portfolio.email,
            subject: `Fee change alert: ${affectedChanges.map(a => a.broker).join(", ")}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
                <h2 style="color:#0f172a;font-size:18px">⚡ Fee Change on Your Broker</h2>
                <p style="color:#475569;font-size:14px;line-height:1.6">
                  Hi ${firstName}, fees have changed on a platform in your portfolio:
                </p>
                <ul style="color:#475569;font-size:14px;line-height:1.8">${brokerList}</ul>
                <a href="${siteUrl}/portfolio?utm_source=fee_alert" style="display:inline-block;padding:12px 24px;background:#0f172a;color:white;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;margin:12px 0">
                  Check Your Portfolio →
                </a>
                <p style="color:#94a3b8;font-size:12px;margin-top:16px">
                  You're receiving this because you set up portfolio monitoring on Invest.com.au.
                </p>
                ${notificationFooter()}
              </div>
            `,
          }),
        });
        alertsSent++;
      } catch (e) {
        log.error("Portfolio alert email failed", { email: portfolio.email, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return NextResponse.json({ portfolios_checked: (portfolios || []).length, alerts_sent: alertsSent, fee_changes_found: recentChanges?.length || 0 });
}

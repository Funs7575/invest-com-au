import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import { logger } from "@/lib/logger";
import { ADMIN_EMAIL } from "@/lib/admin";
import { requireCronAuth } from "@/lib/cron-auth";

const log = logger("monthly-affiliate-report");

/**
 * Cron: Monthly Affiliate Performance Report
 * Schedule: 1st of each month at 6:00 AM UTC
 * Aggregates clicks, signups, and revenue by broker for the previous month.
 */
export async function GET(request: NextRequest) {
  const unauth = requireCronAuth(request);
  if (unauth) return unauth;

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const startDate = `${monthStr}-01T00:00:00Z`;
    const endDate = new Date(year, month, 1).toISOString(); // First day of current month

    log.info(`Generating affiliate report for ${monthStr}`);

    // Get all clicks for the month
    const { data: clicks } = await supabase
      .from("affiliate_clicks")
      .select("broker_slug, broker_name")
      .gte("created_at", startDate)
      .lt("created_at", endDate);

    // Get all signups for the month
    const { data: signups } = await supabase
      .from("broker_signups")
      .select("broker_slug, revenue_cents, status")
      .gte("signup_date", startDate)
      .lt("signup_date", endDate)
      .neq("status", "rejected");

    // Aggregate by broker
    const brokerMap = new Map<string, { name: string; clicks: number; signups: number; revenue: number }>();

    for (const c of clicks || []) {
      if (!brokerMap.has(c.broker_slug)) {
        brokerMap.set(c.broker_slug, { name: c.broker_name || c.broker_slug, clicks: 0, signups: 0, revenue: 0 });
      }
      brokerMap.get(c.broker_slug)!.clicks++;
    }

    for (const s of signups || []) {
      if (!brokerMap.has(s.broker_slug)) {
        brokerMap.set(s.broker_slug, { name: s.broker_slug, clicks: 0, signups: 0, revenue: 0 });
      }
      const stat = brokerMap.get(s.broker_slug)!;
      stat.signups++;
      stat.revenue += s.revenue_cents || 0;
    }

    // Upsert into monthly reports table
    const reports = Array.from(brokerMap.entries()).map(([slug, stat]) => ({
      month: monthStr,
      broker_slug: slug,
      broker_name: stat.name,
      total_clicks: stat.clicks,
      total_signups: stat.signups,
      total_revenue_cents: stat.revenue,
      conversion_rate: stat.clicks > 0 ? stat.signups / stat.clicks : 0,
      epc_cents: stat.clicks > 0 ? stat.revenue / stat.clicks : 0,
    }));

    if (reports.length > 0) {
      await supabase.from("affiliate_monthly_reports").upsert(reports, { onConflict: "month,broker_slug" });
    }

    // Calculate totals for email
    const totalClicks = reports.reduce((s, r) => s + r.total_clicks, 0);
    const totalSignups = reports.reduce((s, r) => s + r.total_signups, 0);
    const totalRevenue = reports.reduce((s, r) => s + r.total_revenue_cents, 0);
    const overallCR = totalClicks > 0 ? ((totalSignups / totalClicks) * 100).toFixed(2) : "0.00";

    // Top 5 brokers by clicks
    const topBrokers = reports.sort((a, b) => b.total_clicks - a.total_clicks).slice(0, 5);

    const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    // Send email report
    const brokerRows = topBrokers.map(b => `
      <tr>
        <td style="padding: 8px 12px; font-weight: 600;">${escapeHtml(b.broker_name)}</td>
        <td style="padding: 8px 12px; text-align: right;">${b.total_clicks.toLocaleString()}</td>
        <td style="padding: 8px 12px; text-align: right;">${b.total_signups}</td>
        <td style="padding: 8px 12px; text-align: right; color: #059669; font-weight: 600;">${fmt(b.total_revenue_cents)}</td>
        <td style="padding: 8px 12px; text-align: right;">${b.conversion_rate ? (b.conversion_rate * 100).toFixed(2) + "%" : "—"}</td>
      </tr>
    `).join("");

    await sendEmail({
      to: ADMIN_EMAIL,
      from: "Invest.com.au <reports@invest.com.au>",
      subject: `Affiliate Report: ${monthStr} — ${fmt(totalRevenue)} revenue, ${totalSignups} signups`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">Monthly Affiliate Report — ${monthStr}</h2>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="display: flex; gap: 16px; margin-bottom: 20px;">
              <div style="flex: 1; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">Clicks</p>
                <p style="margin: 4px 0 0; font-size: 20px; font-weight: 800; color: #0f172a;">${totalClicks.toLocaleString()}</p>
              </div>
              <div style="flex: 1; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">Signups</p>
                <p style="margin: 4px 0 0; font-size: 20px; font-weight: 800; color: #0f172a;">${totalSignups}</p>
              </div>
              <div style="flex: 1; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #64748b;">Revenue</p>
                <p style="margin: 4px 0 0; font-size: 20px; font-weight: 800; color: #059669;">${fmt(totalRevenue)}</p>
              </div>
            </div>
            <p style="font-size: 13px; color: #64748b;">Overall conversion rate: <strong>${overallCR}%</strong></p>
            <h3 style="font-size: 14px; color: #0f172a; margin: 20px 0 8px;">Top Brokers</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0;">
                  <th style="text-align: left; padding: 8px 12px; color: #64748b;">Broker</th>
                  <th style="text-align: right; padding: 8px 12px; color: #64748b;">Clicks</th>
                  <th style="text-align: right; padding: 8px 12px; color: #64748b;">Signups</th>
                  <th style="text-align: right; padding: 8px 12px; color: #64748b;">Revenue</th>
                  <th style="text-align: right; padding: 8px 12px; color: #64748b;">Conv.</th>
                </tr>
              </thead>
              <tbody>${brokerRows}</tbody>
            </table>
            <p style="margin-top: 20px; text-align: center;">
              <a href="https://invest.com.au/admin/affiliate-dashboard" style="display: inline-block; padding: 10px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">View Full Dashboard</a>
            </p>
          </div>
          <div style="padding: 12px; text-align: center; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">Auto-generated on ${new Date().toLocaleDateString("en-AU")} — Invest.com.au</p>
          </div>
        </div>
      `,
    });

    log.info(`Report generated: ${reports.length} brokers, ${totalClicks} clicks, ${totalSignups} signups, ${fmt(totalRevenue)}`);

    return NextResponse.json({
      ok: true,
      month: monthStr,
      brokers: reports.length,
      totalClicks,
      totalSignups,
      totalRevenue: fmt(totalRevenue),
    });
  } catch (err) {
    log.error("Monthly report error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

/**
 * Cron: Daily marketplace stats aggregation + budget enforcement.
 *
 * 1. Aggregate yesterday's campaign_events into campaign_daily_stats
 * 2. Check campaigns that have exceeded total_budget → auto-pause
 * 3. Activate approved campaigns whose start_date has arrived
 * 4. Complete campaigns whose end_date has passed
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const results: { action: string; detail: string }[] = [];

  // ── 1. Aggregate yesterday's events into daily stats ──
  const { data: yesterdayEvents } = await supabase
    .from("campaign_events")
    .select("campaign_id, broker_slug, event_type, cost_cents")
    .gte("created_at", yesterday + "T00:00:00.000Z")
    .lt("created_at", today + "T00:00:00.000Z");

  if (yesterdayEvents && yesterdayEvents.length > 0) {
    // Group by campaign_id
    const statsMap = new Map<number, {
      campaign_id: number;
      broker_slug: string;
      impressions: number;
      clicks: number;
      conversions: number;
      spend_cents: number;
    }>();

    for (const evt of yesterdayEvents) {
      const existing = statsMap.get(evt.campaign_id) || {
        campaign_id: evt.campaign_id,
        broker_slug: evt.broker_slug,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend_cents: 0,
      };

      if (evt.event_type === "impression") existing.impressions++;
      else if (evt.event_type === "click") existing.clicks++;
      else if (evt.event_type === "conversion") existing.conversions++;

      existing.spend_cents += evt.cost_cents || 0;
      statsMap.set(evt.campaign_id, existing);
    }

    // Upsert daily stats
    for (const stats of statsMap.values()) {
      const { error } = await supabase
        .from("campaign_daily_stats")
        .upsert(
          {
            campaign_id: stats.campaign_id,
            broker_slug: stats.broker_slug,
            stat_date: yesterday,
            impressions: stats.impressions,
            clicks: stats.clicks,
            conversions: stats.conversions,
            spend_cents: stats.spend_cents,
          },
          { onConflict: "campaign_id,stat_date" }
        );

      if (!error) {
        results.push({
          action: "stats_aggregated",
          detail: `Campaign #${stats.campaign_id}: ${stats.clicks} clicks, $${(stats.spend_cents / 100).toFixed(2)} spend`,
        });
      }
    }
  }

  // ── 2. Auto-pause campaigns that exceeded total budget ──
  const { data: overBudget } = await supabase
    .from("campaigns")
    .select("id, broker_slug, total_spent_cents, total_budget_cents")
    .eq("status", "active")
    .not("total_budget_cents", "is", null);

  for (const c of overBudget || []) {
    if (c.total_spent_cents >= c.total_budget_cents) {
      await supabase
        .from("campaigns")
        .update({ status: "budget_exhausted", updated_at: now.toISOString() })
        .eq("id", c.id);

      // Notify broker about budget exhaustion
      await supabase.from("broker_notifications").insert({
        broker_slug: c.broker_slug,
        type: "budget_exhausted",
        title: "Campaign Budget Exhausted",
        message: `Campaign #${c.id} has used its full budget of $${(c.total_budget_cents / 100).toFixed(2)}. Top up or create a new campaign to continue advertising.`,
        link: "/broker-portal/campaigns",
        is_read: false,
        email_sent: false,
      });

      results.push({
        action: "budget_exhausted",
        detail: `Campaign #${c.id} (${c.broker_slug}) — spent $${(c.total_spent_cents / 100).toFixed(2)} of $${(c.total_budget_cents / 100).toFixed(2)} budget`,
      });
    }
  }

  // ── 3. Activate approved campaigns whose start_date ≤ today ──
  const { data: toActivate } = await supabase
    .from("campaigns")
    .select("id, broker_slug, name")
    .eq("status", "approved")
    .lte("start_date", today);

  for (const c of toActivate || []) {
    await supabase
      .from("campaigns")
      .update({ status: "active", updated_at: now.toISOString() })
      .eq("id", c.id);

    results.push({
      action: "campaign_activated",
      detail: `Campaign #${c.id} "${c.name}" (${c.broker_slug}) activated`,
    });
  }

  // ── 4. Complete campaigns whose end_date < today ──
  const { data: toComplete } = await supabase
    .from("campaigns")
    .select("id, broker_slug, name, end_date")
    .in("status", ["active", "approved"])
    .not("end_date", "is", null)
    .lt("end_date", today);

  for (const c of toComplete || []) {
    await supabase
      .from("campaigns")
      .update({ status: "completed", updated_at: now.toISOString() })
      .eq("id", c.id);

    results.push({
      action: "campaign_completed",
      detail: `Campaign #${c.id} "${c.name}" (${c.broker_slug}) ended ${c.end_date}`,
    });
  }

  // ── 5. Send daily digest emails to active brokers ──
  let digestsSent = 0;
  if (process.env.RESEND_API_KEY && yesterdayEvents && yesterdayEvents.length > 0) {
    // Group yesterday's stats by broker_slug
    const brokerStats = new Map<string, { impressions: number; clicks: number; conversions: number; spend_cents: number }>();
    for (const evt of yesterdayEvents) {
      const existing = brokerStats.get(evt.broker_slug) || { impressions: 0, clicks: 0, conversions: 0, spend_cents: 0 };
      if (evt.event_type === "impression") existing.impressions++;
      else if (evt.event_type === "click") existing.clicks++;
      else if (evt.event_type === "conversion") existing.conversions++;
      existing.spend_cents += evt.cost_cents || 0;
      brokerStats.set(evt.broker_slug, existing);
    }

    // Fetch broker accounts with active status
    const slugs = Array.from(brokerStats.keys());
    if (slugs.length > 0) {
      const { data: accounts } = await supabase
        .from("broker_accounts")
        .select("broker_slug, email, full_name, company_name")
        .eq("status", "active")
        .in("broker_slug", slugs);

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";

      for (const account of accounts || []) {
        if (!account.email) continue;
        const stats = brokerStats.get(account.broker_slug);
        if (!stats || (stats.impressions === 0 && stats.clicks === 0)) continue;

        const ctr = stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(1) : "0.0";
        const name = account.full_name || account.company_name || account.broker_slug;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Invest.com.au <partners@invest.com.au>",
              to: [account.email],
              subject: `Daily Report: ${stats.clicks} clicks, $${(stats.spend_cents / 100).toFixed(2)} spend — ${yesterday}`,
              html: `
                <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
                  <div style="background: #0f172a; padding: 16px 24px; border-radius: 12px 12px 0 0;">
                    <span style="color: #f59e0b; font-weight: 800; font-size: 14px;">Invest.com.au</span>
                    <span style="color: #94a3b8; font-size: 12px;"> · Daily Report</span>
                  </div>
                  <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">Hi ${name},</p>
                    <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Your Campaign Performance — ${yesterday}</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                      <tr>
                        <td style="padding: 12px; background: #f8fafc; border-radius: 8px 0 0 0; text-align: center; width: 25%;">
                          <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${stats.impressions.toLocaleString()}</div>
                          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Impressions</div>
                        </td>
                        <td style="padding: 12px; background: #f8fafc; text-align: center; width: 25%;">
                          <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${stats.clicks}</div>
                          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Clicks</div>
                        </td>
                        <td style="padding: 12px; background: #f8fafc; text-align: center; width: 25%;">
                          <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${ctr}%</div>
                          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">CTR</div>
                        </td>
                        <td style="padding: 12px; background: #f8fafc; border-radius: 0 8px 0 0; text-align: center; width: 25%;">
                          <div style="font-size: 20px; font-weight: 800; color: #dc2626;">$${(stats.spend_cents / 100).toFixed(2)}</div>
                          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Spend</div>
                        </td>
                      </tr>
                    </table>
                    ${stats.conversions > 0 ? `<p style="margin: 0 0 16px; font-size: 14px; color: #16a34a; font-weight: 600;">🎉 ${stats.conversions} conversion(s) tracked!</p>` : ""}
                    <a href="${baseUrl}/broker-portal/analytics" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">View Full Analytics →</a>
                    <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
                      This is your daily campaign digest from Invest.com.au Partner Portal.
                    </p>
                  </div>
                </div>
              `,
            }),
          });
          digestsSent++;
        } catch {
          // Email failed — non-critical
        }
      }
    }
  }

  return NextResponse.json({
    statsAggregated: results.filter((r) => r.action === "stats_aggregated").length,
    budgetExhausted: results.filter((r) => r.action === "budget_exhausted").length,
    campaignsActivated: results.filter((r) => r.action === "campaign_activated").length,
    campaignsCompleted: results.filter((r) => r.action === "campaign_completed").length,
    digestsSent,
    results,
    timestamp: now.toISOString(),
  });
}

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

  // Shared statsMap for use in anomaly detection later
  const statsMap = new Map<number, {
    campaign_id: number;
    broker_slug: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend_cents: number;
  }>();

  if (yesterdayEvents && yesterdayEvents.length > 0) {
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

  // ── 6. Refresh per-placement stats (monthly impressions, avg CTR) ──
  const { error: refreshErr } = await supabase.rpc("refresh_placement_stats");
  if (!refreshErr) {
    results.push({ action: "placement_stats_refreshed", detail: "Updated monthly_impressions & avg_ctr_pct on marketplace_placements" });
  }

  // ── 7. Smart Budget Pacing Alerts (75% and 90%) ──
  let pacingAlerts = 0;
  for (const c of overBudget || []) {
    if (c.total_spent_cents >= c.total_budget_cents) continue; // Already exhausted
    const pct = (c.total_spent_cents / c.total_budget_cents) * 100;
    const thresholds = [90, 75];
    for (const threshold of thresholds) {
      if (pct >= threshold) {
        // Check if we already sent this threshold alert
        const { count } = await supabase
          .from("broker_notifications")
          .select("id", { count: "exact", head: true })
          .eq("broker_slug", c.broker_slug)
          .eq("type", "budget_pacing")
          .like("message", `%Campaign #${c.id}%${threshold}%`);
        if ((count || 0) === 0) {
          await supabase.from("broker_notifications").insert({
            broker_slug: c.broker_slug,
            type: "budget_pacing",
            title: `Budget ${threshold}% Used`,
            message: `Campaign #${c.id} has used ${pct.toFixed(0)}% of its $${(c.total_budget_cents / 100).toFixed(0)} budget (${threshold}% threshold). Consider increasing your budget or adjusting your rate.`,
            link: "/broker-portal/campaigns",
            is_read: false,
            email_sent: false,
          });
          pacingAlerts++;
          results.push({ action: "budget_pacing_alert", detail: `Campaign #${c.id} at ${pct.toFixed(0)}% (${threshold}% threshold)` });
        }
        break; // Only alert the highest threshold reached
      }
    }
  }

  // ── 8. Performance Anomaly Detection ──
  let anomalyAlerts = 0;
  if (yesterdayEvents && yesterdayEvents.length > 0) {
    // Get 7-day average stats per campaign for comparison
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const { data: weekStats } = await supabase
      .from("campaign_daily_stats")
      .select("campaign_id, broker_slug, clicks, impressions, conversions")
      .gte("stat_date", weekAgo)
      .lt("stat_date", yesterday);

    if (weekStats && weekStats.length > 0) {
      const avgMap = new Map<number, { clicks: number; impressions: number; days: number; broker_slug: string }>();
      for (const s of weekStats) {
        const existing = avgMap.get(s.campaign_id) || { clicks: 0, impressions: 0, days: 0, broker_slug: s.broker_slug };
        existing.clicks += s.clicks;
        existing.impressions += s.impressions;
        existing.days++;
        avgMap.set(s.campaign_id, existing);
      }

      // Check yesterday's stats against 7-day averages
      for (const [campaignId, stats] of (statsMap || new Map())) {
        const avg = avgMap.get(campaignId);
        if (!avg || avg.days < 3) continue;
        const avgDailyClicks = avg.clicks / avg.days;
        const avgDailyImpressions = avg.impressions / avg.days;

        // Detect CTR drop (>50% drop from average)
        const yesterdayCtr = stats.impressions > 0 ? stats.clicks / stats.impressions : 0;
        const avgCtr = avgDailyImpressions > 0 ? (avg.clicks / avg.days) / (avg.impressions / avg.days) : 0;
        if (avgCtr > 0 && yesterdayCtr < avgCtr * 0.5 && stats.impressions >= 50) {
          await supabase.from("broker_notifications").insert({
            broker_slug: stats.broker_slug,
            type: "anomaly",
            title: "CTR Drop Detected",
            message: `Campaign #${campaignId}: CTR dropped to ${(yesterdayCtr * 100).toFixed(1)}% yesterday vs ${(avgCtr * 100).toFixed(1)}% 7-day average. Check your creative or landing page.`,
            link: "/broker-portal/analytics",
            is_read: false,
            email_sent: false,
          });
          anomalyAlerts++;
          results.push({ action: "anomaly_ctr_drop", detail: `Campaign #${campaignId}: ${(yesterdayCtr * 100).toFixed(1)}% vs ${(avgCtr * 100).toFixed(1)}% avg` });
        }

        // Detect zero clicks despite impressions
        if (stats.clicks === 0 && stats.impressions >= 100) {
          await supabase.from("broker_notifications").insert({
            broker_slug: stats.broker_slug,
            type: "anomaly",
            title: "Zero Clicks Warning",
            message: `Campaign #${campaignId} received ${stats.impressions} impressions but 0 clicks yesterday. Your ad may need refreshing.`,
            link: "/broker-portal/campaigns",
            is_read: false,
            email_sent: false,
          });
          anomalyAlerts++;
        }

        // Detect conversion spike (>2x average, celebrate!)
        if (stats.conversions >= 3 && avgDailyClicks > 0) {
          const avgDailyConversions = weekStats
            .filter(s => s.campaign_id === campaignId)
            .reduce((sum, s) => sum + (s.conversions || 0), 0) / avg.days;
          if (avgDailyConversions > 0 && stats.conversions > avgDailyConversions * 2) {
            await supabase.from("broker_notifications").insert({
              broker_slug: stats.broker_slug,
              type: "anomaly",
              title: "Conversion Spike!",
              message: `Campaign #${campaignId} got ${stats.conversions} conversions yesterday — ${(stats.conversions / avgDailyConversions).toFixed(1)}x your daily average! Keep it up.`,
              link: "/broker-portal/analytics",
              is_read: false,
              email_sent: false,
            });
            anomalyAlerts++;
          }
        }
      }
    }
  }

  // ── 9. Automated Campaign Recommendations ──
  let recommendationsSent = 0;
  {
    // Get campaigns with enough data (at least 7 days, still active)
    const thirtyAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: campStats } = await supabase
      .from("campaign_daily_stats")
      .select("campaign_id, broker_slug, clicks, impressions, conversions, spend_cents")
      .gte("stat_date", thirtyAgo);

    if (campStats && campStats.length > 0) {
      const campAgg = new Map<number, { broker_slug: string; clicks: number; impressions: number; conversions: number; spend: number; days: Set<string> }>();
      for (const s of campStats) {
        const existing = campAgg.get(s.campaign_id) || { broker_slug: s.broker_slug, clicks: 0, impressions: 0, conversions: 0, spend: 0, days: new Set() };
        existing.clicks += s.clicks;
        existing.impressions += s.impressions;
        existing.conversions += s.conversions || 0;
        existing.spend += s.spend_cents;
        campAgg.set(s.campaign_id, existing);
      }

      for (const [campId, agg] of campAgg) {
        if (agg.clicks < 20) continue; // Not enough data
        const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
        const cpc = agg.clicks > 0 ? agg.spend / agg.clicks / 100 : 0;
        const convRate = agg.clicks > 0 ? (agg.conversions / agg.clicks) * 100 : 0;

        // Only send one recommendation per campaign per week
        const { count: recentRecs } = await supabase
          .from("broker_notifications")
          .select("id", { count: "exact", head: true })
          .eq("broker_slug", agg.broker_slug)
          .eq("type", "recommendation")
          .like("message", `%Campaign #${campId}%`)
          .gte("created_at", new Date(now.getTime() - 7 * 86400000).toISOString());
        if ((recentRecs || 0) > 0) continue;

        // High CTR but low conversions → landing page issue
        if (ctr > 3 && convRate < 1 && agg.clicks >= 50) {
          await supabase.from("broker_notifications").insert({
            broker_slug: agg.broker_slug,
            type: "recommendation",
            title: "Landing Page Optimization",
            message: `Campaign #${campId}: Great CTR (${ctr.toFixed(1)}%) but low conversion rate (${convRate.toFixed(1)}%). Your ad is working — consider improving your landing page or signup flow.`,
            link: "/broker-portal/analytics",
            is_read: false,
            email_sent: false,
          });
          recommendationsSent++;
          continue;
        }

        // Low CTR → try different creative
        if (ctr < 1.0 && agg.impressions >= 500) {
          await supabase.from("broker_notifications").insert({
            broker_slug: agg.broker_slug,
            type: "recommendation",
            title: "Improve Ad Engagement",
            message: `Campaign #${campId}: CTR is ${ctr.toFixed(1)}% (below 1%). Try updating your creative, adjusting your CTA text, or running an A/B test.`,
            link: "/broker-portal/ab-tests",
            is_read: false,
            email_sent: false,
          });
          recommendationsSent++;
          continue;
        }

        // High CPC → reduce rate or switch placements
        if (cpc > 3.0 && agg.clicks >= 30) {
          await supabase.from("broker_notifications").insert({
            broker_slug: agg.broker_slug,
            type: "recommendation",
            title: "Optimize Spend Efficiency",
            message: `Campaign #${campId}: Your CPC is $${cpc.toFixed(2)} — higher than the $1.80 industry average. Consider lowering your rate or trying a different placement.`,
            link: "/broker-portal/campaigns",
            is_read: false,
            email_sent: false,
          });
          recommendationsSent++;
        }
      }
    }
  }

  // ── 10. Re-engagement Automation ──
  let reEngagementsSent = 0;
  if (process.env.RESEND_API_KEY) {
    // Find brokers with no campaigns in the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

    const { data: allBrokers } = await supabase
      .from("broker_accounts")
      .select("broker_slug, email, full_name, company_name, last_login_at")
      .eq("status", "active");

    for (const broker of allBrokers || []) {
      if (!broker.email) continue;

      // Check if we already sent a re-engagement notification this month
      const { count: recentReEng } = await supabase
        .from("broker_notifications")
        .select("id", { count: "exact", head: true })
        .eq("broker_slug", broker.broker_slug)
        .eq("type", "re_engagement")
        .gte("created_at", thirtyDaysAgo);
      if ((recentReEng || 0) > 0) continue;

      // Check last activity
      const { count: recentCampaigns } = await supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("broker_slug", broker.broker_slug)
        .gte("created_at", thirtyDaysAgo);

      const { count: recentEvents } = await supabase
        .from("campaign_events")
        .select("id", { count: "exact", head: true })
        .eq("broker_slug", broker.broker_slug)
        .gte("created_at", fourteenDaysAgo);

      const isInactive = (recentCampaigns || 0) === 0 && (recentEvents || 0) === 0;
      const lastLogin = broker.last_login_at ? new Date(broker.last_login_at) : null;
      const daysSinceLogin = lastLogin ? (now.getTime() - lastLogin.getTime()) / 86400000 : 999;

      if (isInactive && daysSinceLogin > 14) {
        const brokerName = broker.full_name || broker.company_name || broker.broker_slug;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";

        // Create notification
        await supabase.from("broker_notifications").insert({
          broker_slug: broker.broker_slug,
          type: "re_engagement",
          title: "We Miss You!",
          message: `It's been a while since your last campaign. Check out new placements and features in the marketplace.`,
          link: "/broker-portal/campaigns/new",
          is_read: false,
          email_sent: true,
        });

        // Send email
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Invest.com.au <partners@invest.com.au>",
              to: [broker.email],
              subject: `${brokerName}, your advertising spot is waiting`,
              html: `
                <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
                  <div style="background: #0f172a; padding: 16px 24px; border-radius: 12px 12px 0 0;">
                    <span style="color: #f59e0b; font-weight: 800; font-size: 14px;">Invest.com.au</span>
                  </div>
                  <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">Hi ${brokerName},</p>
                    <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Your Advertising Spot Awaits</h2>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                      It's been a while since your last campaign on Invest.com.au. Our marketplace has new placements and features
                      that could drive more leads to your platform.
                    </p>
                    <a href="${baseUrl}/broker-portal/campaigns/new" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">Create a Campaign →</a>
                    <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
                      From the Invest.com.au Partner Team
                    </p>
                  </div>
                </div>
              `,
            }),
          });
          reEngagementsSent++;
        } catch {
          // Non-critical
        }

        results.push({ action: "re_engagement", detail: `Sent to ${broker.broker_slug}` });
      }
    }
  }

  return NextResponse.json({
    statsAggregated: results.filter((r) => r.action === "stats_aggregated").length,
    budgetExhausted: results.filter((r) => r.action === "budget_exhausted").length,
    campaignsActivated: results.filter((r) => r.action === "campaign_activated").length,
    campaignsCompleted: results.filter((r) => r.action === "campaign_completed").length,
    placementStatsRefreshed: !refreshErr,
    digestsSent,
    pacingAlerts,
    anomalyAlerts,
    recommendationsSent,
    reEngagementsSent,
    results,
    timestamp: now.toISOString(),
  });
}

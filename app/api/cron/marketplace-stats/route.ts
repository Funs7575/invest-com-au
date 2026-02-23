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

  return NextResponse.json({
    statsAggregated: results.filter((r) => r.action === "stats_aggregated").length,
    budgetExhausted: results.filter((r) => r.action === "budget_exhausted").length,
    campaignsActivated: results.filter((r) => r.action === "campaign_activated").length,
    campaignsCompleted: results.filter((r) => r.action === "campaign_completed").length,
    results,
    timestamp: now.toISOString(),
  });
}

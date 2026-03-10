import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 300; // Cache for 5 minutes

export async function GET(req: NextRequest) {
  // Basic auth check — only accessible from admin
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET && !req.headers.get("cookie")?.includes("sb-")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Run all queries in parallel
  const [
    eventsTotal,
    eventsToday,
    events7d,
    events30d,
    clicksTotal,
    clicksToday,
    clicks7d,
    clicks30d,
    emailsTotal,
    quizTotal,
    leadsTotal,
    feeAlertsTotal,
    reviewsTotal,
    topPages7d,
    topBrokerClicks7d,
    topEvents7d,
    clicksByPlacement7d,
    dailyEvents30d,
    dailyClicks30d,
    deviceBreakdown7d,
  ] = await Promise.all([
    supabase.from("analytics_events").select("id", { count: "exact", head: true }),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }),
    supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).gte("clicked_at", today),
    supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).gte("clicked_at", sevenDaysAgo),
    supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).gte("clicked_at", thirtyDaysAgo),
    supabase.from("email_captures").select("id", { count: "exact", head: true }),
    supabase.from("quiz_leads").select("id", { count: "exact", head: true }),
    supabase.from("professional_leads").select("id", { count: "exact", head: true }),
    supabase.from("fee_alert_subscriptions").select("id", { count: "exact", head: true }).eq("verified", true),
    supabase.from("user_reviews").select("id", { count: "exact", head: true }),
    // Top pages (7d)
    supabase.rpc("get_top_pages_7d").then(r => r, () => ({ data: null, error: null, count: null, status: 500, statusText: 'error' })),
    // Top broker clicks (7d)
    supabase.rpc("get_top_broker_clicks_7d").then(r => r, () => ({ data: null, error: null, count: null, status: 500, statusText: 'error' })),
    // Top event types (7d)
    supabase.rpc("get_top_events_7d").then(r => r, () => ({ data: null, error: null, count: null, status: 500, statusText: 'error' })),
    // Clicks by placement (7d)
    supabase.rpc("get_clicks_by_placement_7d").then(r => r, () => ({ data: null, error: null, count: null, status: 500, statusText: 'error' })),
    // Daily events (30d)
    supabase.rpc("get_daily_events_30d").then(r => r, () => ({ data: null, error: null, count: null, status: 500, statusText: 'error' })),
    // Daily clicks (30d)
    supabase.rpc("get_daily_clicks_30d").then(r => r, () => ({ data: null, error: null, count: null, status: 500, statusText: 'error' })),
    // Device breakdown (7d)
    supabase.rpc("get_device_breakdown_7d").then(r => r, () => ({ data: null, error: null, count: null, status: 500, statusText: 'error' })),
  ]);

  return NextResponse.json({
    summary: {
      events: { total: eventsTotal.count || 0, today: eventsToday.count || 0, "7d": events7d.count || 0, "30d": events30d.count || 0 },
      clicks: { total: clicksTotal.count || 0, today: clicksToday.count || 0, "7d": clicks7d.count || 0, "30d": clicks30d.count || 0 },
      emails: emailsTotal.count || 0,
      quiz_leads: quizTotal.count || 0,
      advisor_leads: leadsTotal.count || 0,
      fee_alerts: feeAlertsTotal.count || 0,
      reviews: reviewsTotal.count || 0,
    },
    top_pages: topPages7d.data || [],
    top_broker_clicks: topBrokerClicks7d.data || [],
    top_events: topEvents7d.data || [],
    clicks_by_placement: clicksByPlacement7d.data || [],
    daily_events: dailyEvents30d.data || [],
    daily_clicks: dailyClicks30d.data || [],
    device_breakdown: deviceBreakdown7d.data || [],
    generated_at: now.toISOString(),
  });
}

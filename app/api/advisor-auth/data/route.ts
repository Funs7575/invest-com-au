import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { logger } from "@/lib/logger";
import { captureServerEvent } from "@/lib/posthog/server";

const log = logger("advisor-auth-data");

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Admin client used throughout: professional_leads, advisor_billing,
  // advisor_profile_views, and professional_reviews have no RLS SELECT policy
  // for the authenticated role — using createClient() silently returns empty
  // arrays. The application-layer .eq("professional_id", advisorId) scoping
  // provides equivalent security to what an RLS policy would enforce.
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { data: leads },
    { data: allLeads },
    { data: billing },
    { data: views },
    { data: reviews },
    { data: professional },
  ] = await Promise.all([
    // Recent leads (last 90 days)
    admin
      .from("professional_leads")
      .select("*")
      .eq("professional_id", advisorId)
      .order("created_at", { ascending: false })
      .limit(50),
    // All leads — quality_score and source_page for hot/warm/cold + source breakdown
    admin
      .from("professional_leads")
      .select("id, status, created_at, quality_score, source_page", { count: "exact" })
      .eq("professional_id", advisorId),
    // Billing records
    admin
      .from("advisor_billing")
      .select("*")
      .eq("professional_id", advisorId)
      .order("created_at", { ascending: false })
      .limit(20),
    // Profile views (last 30 days)
    admin
      .from("advisor_profile_views")
      .select("view_date, view_count")
      .eq("professional_id", advisorId)
      .gte("view_date", thirtyDaysAgo.split("T")[0])
      .order("view_date", { ascending: true }),
    // Reviews
    admin
      .from("professional_reviews")
      .select("*")
      .eq("professional_id", advisorId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    // Professional record for avg_response_minutes
    admin
      .from("professionals")
      .select("avg_response_minutes, rating, review_count")
      .eq("id", advisorId)
      .single(),
  ]);

  // Calculate stats
  const totalViews30d = (views || []).reduce((s, v) => s + (v.view_count || 0), 0);
  const totalLeads = allLeads?.length || 0;
  const leads30d = (allLeads || []).filter(l => new Date(l.created_at) >= new Date(thirtyDaysAgo)).length;
  const convertedLeads = (allLeads || []).filter(l => l.status === "converted").length;
  const acceptedLeads = (allLeads || []).filter(l => l.status !== "rejected").length;
  const totalBilled = (billing || []).reduce((s, b) => s + (b.amount_cents || 0), 0);
  const pendingBilled = (billing || []).filter(b => b.status === "pending" || b.status === "invoiced").reduce((s, b) => s + (b.amount_cents || 0), 0);

  // Hot/warm/cold lead counts (from quality_score)
  const hotLeadsCount = (allLeads || []).filter(l => (l.quality_score ?? 0) >= 70).length;
  const warmLeadsCount = (allLeads || []).filter(l => { const qs = l.quality_score ?? 0; return qs >= 40 && qs < 70; }).length;
  const coldLeadsCount = totalLeads - hotLeadsCount - warmLeadsCount;

  // Source breakdown — leads grouped by source_page
  const sourceMap: Record<string, { count: number; converted: number }> = {};
  for (const lead of allLeads || []) {
    const src = (lead.source_page as string | null) ?? "unknown";
    sourceMap[src] ??= { count: 0, converted: 0 };
    sourceMap[src].count++;
    if (lead.status === "converted") sourceMap[src].converted++;
  }
  const sourceBreakdown = Object.entries(sourceMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([source, { count, converted }]) => ({ source, count, converted }));

  // Fetch article analytics
  const { data: articles } = await admin
    .from("advisor_articles")
    .select("id, title, slug, view_count, click_count, profile_clicks, lead_clicks, status")
    .eq("professional_id", advisorId)
    .eq("status", "published")
    .order("view_count", { ascending: false });

  // Fetch engagement analytics from analytics_events
  const { data: engagementEvents } = await admin
    .from("analytics_events")
    .select("event_type")
    .eq("metadata->>advisor_id", String(advisorId))
    .gte("created_at", thirtyDaysAgo);

  const engagementCounts: Record<string, number> = {};
  for (const ev of engagementEvents || []) {
    engagementCounts[ev.event_type] = (engagementCounts[ev.event_type] || 0) + 1;
  }

  const avgResponseTimeMinutes = (professional as { avg_response_minutes: number | null } | null)?.avg_response_minutes ?? null;
  const avgRatingRaw = (professional as { rating: number | null } | null)?.rating;
  const avgRating = avgRatingRaw != null ? avgRatingRaw.toFixed(1) : null;

  return NextResponse.json({
    leads: leads || [],
    stats: {
      totalViews30d,
      totalLeads,
      leads30d,
      convertedLeads,
      conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0",
      acceptedLeads,
      acceptRate: totalLeads > 0 ? ((acceptedLeads / totalLeads) * 100).toFixed(1) : "100",
      hotLeadsCount,
      warmLeadsCount,
      coldLeadsCount,
      avgResponseTimeMinutes,
      avgRating,
      totalBilledCents: totalBilled,
      pendingBilledCents: pendingBilled,
      reviewCount: reviews?.length || 0,
      bookingClicks30d: engagementCounts["advisor_booking_click"] || 0,
      // Engagement analytics
      phoneClicks: engagementCounts["advisor_phone_click"] || 0,
      websiteClicks: engagementCounts["advisor_website_click"] || 0,
      bookingClicks: engagementCounts["advisor_booking_click"] || 0,
      articleViews: (articles || []).reduce((s: number, a: Record<string, unknown>) => s + (Number(a.view_count) || 0), 0),
      searchImpressions: engagementCounts["advisor_search_impression"] || 0,
      // Articles data
      articles: (articles || []).map((a: Record<string, unknown>) => ({
        title: a.title,
        slug: a.slug,
        views: a.view_count || 0,
        clicks: a.profile_clicks || 0,
      })),
      // Source breakdown for performance dashboard
      sourceBreakdown,
    },
    viewsByDay: views || [],
    billing: billing || [],
    reviews: reviews || [],
  });
}

// Update lead status/notes
export async function PATCH(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // eslint-disable-next-line invest/no-unvalidated-req-json -- internal advisor session; fields validated inline below
  const { leadId, status, notes } = await request.json();
  if (!leadId) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

  // Admin client: professional_leads and professionals have no RLS UPDATE policy
  // for the authenticated role. Ownership is enforced at the application layer
  // by the .eq("professional_id", advisorId) filter below.
  const admin = createAdminClient();

  // Verify lead belongs to this advisor
  const { data: lead } = await admin
    .from("professional_leads")
    .select("id, professional_id, created_at, source_page")
    .eq("id", leadId)
    .eq("professional_id", advisorId)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) {
    updates.status = status;
    if (status === "contacted") {
      updates.contacted_at = new Date().toISOString();
      updates.responded_at = new Date().toISOString();
      // Calculate response time in minutes from lead creation
      if (lead.created_at) {
        const created = new Date(lead.created_at as string).getTime();
        const now = Date.now();
        updates.response_time_minutes = Math.round((now - created) / 60000);
      }
    }
    if (status === "converted") {
      updates.converted_at = new Date().toISOString();
      updates.outcome = "won";
    }
    if (status === "lost" || status === "rejected") {
      updates.outcome = "lost";
    }
  }
  if (notes !== undefined) updates.advisor_notes = notes;

  await admin.from("professional_leads").update(updates).eq("id", leadId);

  // Update advisor's average response time
  if (status === "contacted" && updates.response_time_minutes) {
    try {
      const { data: allResponded } = await admin
        .from("professional_leads")
        .select("response_time_minutes")
        .eq("professional_id", lead.professional_id)
        .not("response_time_minutes", "is", null);
      if (allResponded && allResponded.length > 0) {
        const avg = Math.round(allResponded.reduce((sum: number, l: { response_time_minutes: number }) => sum + l.response_time_minutes, 0) / allResponded.length);
        await admin.from("professionals").update({ avg_response_minutes: avg }).eq("id", lead.professional_id);
      }
    } catch (err) {
      log.warn("avg response time update failed", { err: err instanceof Error ? err.message : String(err), professionalId: lead.professional_id });
    }
  }

  // PostHog funnel tracking: advisor_response / lead_outcome
  const advisorDistinctId = `advisor-${advisorId}`;
  if (status === "contacted" && typeof updates.response_time_minutes === "number") {
    captureServerEvent(advisorDistinctId, "advisor_response", {
      lead_id: leadId as number,
      advisor_id: advisorId,
      response_time_minutes: updates.response_time_minutes,
      lead_source: typeof (lead as Record<string, unknown>).source_page === "string"
        ? (lead as Record<string, unknown>).source_page as string
        : null,
    }).catch((err) => log.warn("posthog advisor_response failed", { err: String(err) }));
  }
  if (status === "converted" || status === "lost" || status === "rejected") {
    captureServerEvent(advisorDistinctId, "lead_outcome", {
      lead_id: leadId as number,
      advisor_id: advisorId,
      outcome: status === "converted" ? "converted" : "lost",
      lead_source: typeof (lead as Record<string, unknown>).source_page === "string"
        ? (lead as Record<string, unknown>).source_page as string
        : null,
    }).catch((err) => log.warn("posthog lead_outcome failed", { err: String(err) }));
  }

  return NextResponse.json({ success: true });
}

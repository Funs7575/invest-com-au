import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdvisorId(request: NextRequest): Promise<number | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  
  // Try Supabase Auth first
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: advisor } = await admin
      .from("professionals")
      .select("id")
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (advisor) return advisor.id;
  }
  
  // Fallback: legacy cookie session
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;
  const { data } = await admin
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.professional_id;
}

export async function GET(request: NextRequest) {
  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = await createClient();
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { data: leads },
    { data: allLeads },
    { data: billing },
    { data: views },
    { data: reviews },
  ] = await Promise.all([
    // Recent leads (last 90 days)
    supabase
      .from("professional_leads")
      .select("*")
      .eq("professional_id", advisorId)
      .order("created_at", { ascending: false })
      .limit(50),
    // All leads count
    supabase
      .from("professional_leads")
      .select("id, status, created_at", { count: "exact" })
      .eq("professional_id", advisorId),
    // Billing records
    supabase
      .from("advisor_billing")
      .select("*")
      .eq("professional_id", advisorId)
      .order("created_at", { ascending: false })
      .limit(20),
    // Profile views (last 30 days)
    supabase
      .from("advisor_profile_views")
      .select("view_date, view_count")
      .eq("professional_id", advisorId)
      .gte("view_date", thirtyDaysAgo.split("T")[0])
      .order("view_date", { ascending: true }),
    // Reviews
    supabase
      .from("professional_reviews")
      .select("*")
      .eq("professional_id", advisorId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  // Calculate stats
  const totalViews30d = (views || []).reduce((s, v) => s + (v.view_count || 0), 0);
  const totalLeads = allLeads?.length || 0;
  const leads30d = (allLeads || []).filter(l => new Date(l.created_at) >= new Date(thirtyDaysAgo)).length;
  const convertedLeads = (allLeads || []).filter(l => l.status === "converted").length;
  const totalBilled = (billing || []).reduce((s, b) => s + (b.amount_cents || 0), 0);
  const pendingBilled = (billing || []).filter(b => b.status === "pending" || b.status === "invoiced").reduce((s, b) => s + (b.amount_cents || 0), 0);

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

  return NextResponse.json({
    leads: leads || [],
    stats: {
      totalViews30d,
      totalLeads,
      leads30d,
      convertedLeads,
      conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0",
      totalBilledCents: totalBilled,
      pendingBilledCents: pendingBilled,
      reviewCount: reviews?.length || 0,
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
    },
    viewsByDay: views || [],
    billing: billing || [],
    reviews: reviews || [],
  });
}

// Update lead status/notes
export async function PATCH(request: NextRequest) {
  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { leadId, status, notes } = await request.json();
  if (!leadId) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

  const supabase = await createClient();

  // Verify lead belongs to this advisor
  const { data: lead } = await supabase
    .from("professional_leads")
    .select("id, professional_id, created_at")
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

  await supabase.from("professional_leads").update(updates).eq("id", leadId);

  // Update advisor's average response time
  if (status === "contacted" && updates.response_time_minutes) {
    try {
      const { data: allResponded } = await supabase
        .from("professional_leads")
        .select("response_time_minutes")
        .eq("professional_id", lead.professional_id)
        .not("response_time_minutes", "is", null);
      if (allResponded && allResponded.length > 0) {
        const avg = Math.round(allResponded.reduce((sum: number, l: { response_time_minutes: number }) => sum + l.response_time_minutes, 0) / allResponded.length);
        await supabase.from("professionals").update({ avg_response_minutes: avg }).eq("id", lead.professional_id);
      }
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ success: true });
}

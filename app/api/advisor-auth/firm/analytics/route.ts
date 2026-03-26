import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("advisor_session")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const supabase = await createClient();
    const { data: session } = await supabase
      .from("advisor_sessions")
      .select("professional_id, expires_at")
      .eq("session_token", sessionToken)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { data: advisor } = await supabase
      .from("professionals")
      .select("id, firm_id, is_firm_admin")
      .eq("id", session.professional_id)
      .single();

    if (!advisor?.firm_id) {
      return NextResponse.json({ error: "Not in a firm" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Get all members in the firm
    const { data: members } = await adminSupabase
      .from("professionals")
      .select("id, name, slug, photo_url, type, status, verified, credit_balance_cents, free_leads_used, lead_price_cents, rating, review_count")
      .eq("firm_id", advisor.firm_id)
      .order("created_at", { ascending: true });

    if (!members || members.length === 0) {
      return NextResponse.json({ members: [], summary: null });
    }

    const memberIds = members.map(m => m.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Aggregate leads across all members
    const { data: allLeads } = await adminSupabase
      .from("professional_leads")
      .select("id, professional_id, status, bill_amount_cents, billed, created_at")
      .in("professional_id", memberIds);

    const leads = allLeads || [];
    const leads30d = leads.filter(l => l.created_at >= thirtyDaysAgo);

    // Aggregate profile views across all members
    const { data: allViews } = await adminSupabase
      .from("professional_views")
      .select("professional_id, view_date, view_count")
      .in("professional_id", memberIds)
      .gte("view_date", thirtyDaysAgo.split("T")[0]);

    const totalViews30d = (allViews || []).reduce((sum, v) => sum + (v.view_count || 0), 0);

    // Per-member stats
    const memberStats = members.map(m => {
      const mLeads = leads.filter(l => l.professional_id === m.id);
      const mLeads30d = mLeads.filter(l => l.created_at >= thirtyDaysAgo);
      const mViews30d = (allViews || []).filter(v => v.professional_id === m.id).reduce((sum, v) => sum + (v.view_count || 0), 0);
      const totalBilledCents = mLeads.filter(l => l.billed).reduce((sum, l) => sum + (l.bill_amount_cents || 0), 0);
      const convertedLeads = mLeads.filter(l => l.status === "converted").length;

      return {
        ...m,
        leads30d: mLeads30d.length,
        totalLeads: mLeads.length,
        views30d: mViews30d,
        totalBilledCents,
        convertedLeads,
        conversionRate: mLeads.length > 0 ? ((convertedLeads / mLeads.length) * 100).toFixed(1) + "%" : "0%",
      };
    });

    // Firm summary
    const totalLeads = leads.length;
    const totalLeads30d = leads30d.length;
    const totalConverted = leads.filter(l => l.status === "converted").length;
    const totalBilledCents = leads.filter(l => l.billed).reduce((sum, l) => sum + (l.bill_amount_cents || 0), 0);
    const totalCreditCents = members.reduce((sum, m) => sum + (m.credit_balance_cents || 0), 0);
    const avgRating = members.filter(m => (m.review_count || 0) > 0 && m.rating).length > 0
      ? (members.filter(m => m.rating).reduce((sum, m) => sum + Number(m.rating), 0) / members.filter(m => m.rating).length).toFixed(1)
      : null;

    return NextResponse.json({
      members: memberStats,
      summary: {
        totalMembers: members.length,
        totalLeads,
        totalLeads30d,
        totalViews30d,
        totalConverted,
        conversionRate: totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) + "%" : "0%",
        totalBilledCents,
        totalCreditCents,
        avgRating,
      },
    });
  } catch (error) {
    console.error("[firm/analytics] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

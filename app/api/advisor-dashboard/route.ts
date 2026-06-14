import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// advisor_bookings is non-anon RLS; the booking read below uses the
// service-role client, scoped in-query to the validated advisorId.
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { deriveProfileCompleteness } from "@/lib/advisor-portal/profile-completeness";

export async function GET(request: NextRequest) {
  // Accept BOTH auth schemes — the Supabase JWT minted by magic-link/password
  // login AND the legacy advisor_session cookie — via the shared resolver. The
  // previous cookie-only check 401'd every advisor who logged in with a JWT,
  // which blanked the dashboard stats and tripped the load-error banner.
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = await createClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // advisor_bookings is non-anon RLS, so it needs the service-role client.
  // Guard its construction: in preview envs without SUPABASE_SERVICE_ROLE_KEY,
  // createAdminClient() throws — and because it was called inline inside the
  // Promise.all, that throw rejected the ENTIRE dashboard fetch (500 → every KPI
  // 0 + the "couldn't be loaded" banner). Degrade to a null admin client so the
  // rest of the dashboard still loads.
  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  // allSettled (not all): one failing slice degrades that one card rather than
  // blanking the whole dashboard.
  const [advisorR, leadsR, billingR, viewsR, reviewsR, bookingsR] =
    await Promise.allSettled([
    // Advisor profile (for completeness check + billing)
    supabase
      .from("professionals")
      .select(
        "id, name, slug, firm_name, email, photo_url, type, location_display, rating, review_count, verified, bio, specialties, fee_structure, fee_description, website, phone, booking_link, booking_intro, credit_balance_cents, lead_price_cents, free_leads_used, stripe_connect_payouts_enabled"
      )
      .eq("id", advisorId)
      .single(),
    // All leads
    supabase
      .from("professional_leads")
      .select(
        "id, user_name, user_email, user_phone, message, source_page, status, quality_score, quality_signals, qualification_data, lead_tier, advisor_notes, contacted_at, converted_at, created_at, responded_at, response_time_minutes"
      )
      .eq("professional_id", advisorId)
      .order("created_at", { ascending: false })
      .limit(50),
    // Billing records
    supabase
      .from("advisor_billing")
      .select("id, amount_cents, description, status, invoice_number, created_at")
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
      .select(
        "id, reviewer_name, rating, title, body, created_at, communication_rating, expertise_rating, value_for_money_rating"
      )
      .eq("professional_id", advisorId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    // Bookings count (booking-clicks stat) — service-role, scoped to the
    // validated advisorId; resolves to [] when no admin client is available.
    admin
      ? admin
          .from("advisor_bookings")
          .select("id, created_at")
          .eq("professional_id", advisorId)
          .gte("created_at", thirtyDaysAgo)
      : Promise.resolve({ data: [] as { id: string; created_at: string }[] }),
  ]);

  // Unwrap each settled slice → data (or null/[] on failure).
  const advisor = advisorR.status === "fulfilled" ? advisorR.value.data : null;
  const leads = leadsR.status === "fulfilled" ? leadsR.value.data : null;
  const billing = billingR.status === "fulfilled" ? billingR.value.data : null;
  const views = viewsR.status === "fulfilled" ? viewsR.value.data : null;
  const reviews = reviewsR.status === "fulfilled" ? reviewsR.value.data : null;
  const bookings = bookingsR.status === "fulfilled" ? bookingsR.value.data : null;

  // Fetch category pricing for this advisor's type
  let categoryPricing = null;
  if (advisor?.type) {
    const { data: catPricing } = await supabase
      .from("lead_pricing")
      .select("price_cents, free_trial_leads, featured_monthly_cents")
      .eq("advisor_type", advisor.type)
      .single();
    categoryPricing = catPricing;
  }

  // --- Stats ---
  const totalViews30d = (views || []).reduce(
    (s, v) => s + (v.view_count || 0),
    0
  );
  const allLeads = leads || [];
  const totalLeads = allLeads.length;
  const leads30d = allLeads.filter(
    (l) => new Date(l.created_at) >= new Date(thirtyDaysAgo)
  ).length;
  const convertedLeads = allLeads.filter(
    (l) => l.status === "converted"
  ).length;
  const totalBilledCents = (billing || []).reduce(
    (s, b) => s + (b.amount_cents || 0),
    0
  );
  const pendingBilledCents = (billing || [])
    .filter((b) => b.status === "pending" || b.status === "invoiced")
    .reduce((s, b) => s + (b.amount_cents || 0), 0);

  // Average rating
  const approvedReviews = reviews || [];
  const avgRating =
    approvedReviews.length > 0
      ? (
          approvedReviews.reduce((s, r) => s + r.rating, 0) /
          approvedReviews.length
        ).toFixed(1)
      : null;

  // Booking clicks
  const bookingClicks30d = bookings?.length || 0;

  // --- Lead quality summary ---
  const hotLeadsCount = allLeads.filter((l) => (l.quality_score ?? 0) >= 70).length;
  const warmLeadsCount = allLeads.filter((l) => {
    const s = l.quality_score ?? 0;
    return s >= 40 && s < 70;
  }).length;
  const coldLeadsCount = allLeads.filter((l) => (l.quality_score ?? 0) < 40).length;

  // --- Avg response time ---
  const respondedLeads = allLeads.filter(
    (l) => (l as { response_time_minutes?: number | null }).response_time_minutes != null
  );
  const avgResponseTimeMinutes =
    respondedLeads.length > 0
      ? Math.round(
          respondedLeads.reduce(
            (s, l) => s + ((l as { response_time_minutes?: number | null }).response_time_minutes ?? 0),
            0
          ) / respondedLeads.length
        )
      : null;

  // --- Accept rate (contacted or converted / total) ---
  const acceptedLeads = allLeads.filter(
    (l) => l.status === "contacted" || l.status === "converted"
  ).length;
  const acceptRate =
    totalLeads > 0
      ? parseFloat(((acceptedLeads / totalLeads) * 100).toFixed(1))
      : 0;

  // --- Source breakdown ---
  const sourceMap: Record<string, { count: number; converted: number }> = {};
  for (const lead of allLeads) {
    const src = (lead.source_page as string | null) ?? "unknown";
    sourceMap[src] ??= { count: 0, converted: 0 };
    sourceMap[src].count++;
    if (lead.status === "converted") sourceMap[src].converted++;
  }
  const sourceBreakdown = Object.entries(sourceMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([source, { count, converted }]) => ({ source, count, converted }));

  // --- Period-comparison lead counts ---
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const leads7d = allLeads.filter(
    (l) => new Date(l.created_at) >= sevenDaysAgo
  ).length;
  const leadsThisMonth = allLeads.filter(
    (l) => new Date(l.created_at) >= thisMonthStart
  ).length;
  const leadsLastMonth = allLeads.filter((l) => {
    const d = new Date(l.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  }).length;

  // --- Weekly enquiries (last 8 weeks) ---
  const weeklyEnquiries: { weekLabel: string; count: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - w * 7 * 86400000);
    const count = allLeads.filter((l) => {
      const d = new Date(l.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    const label = weekStart.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
    weeklyEnquiries.push({ weekLabel: label, count });
  }

  // --- Profile completeness (derived; shared with the onboarding wizard) ---
  const completeness = deriveProfileCompleteness(advisor as Record<string, unknown> | null);

  return NextResponse.json({
    advisor,
    leads: allLeads,
    categoryPricing,
    stats: {
      totalViews30d,
      totalLeads,
      leads30d,
      convertedLeads,
      conversionRate:
        totalLeads > 0
          ? ((convertedLeads / totalLeads) * 100).toFixed(1)
          : "0",
      totalBilledCents,
      pendingBilledCents,
      reviewCount: approvedReviews.length,
      avgRating,
      bookingClicks30d,
      hotLeadsCount,
      warmLeadsCount,
      coldLeadsCount,
      avgResponseTimeMinutes,
      acceptedLeads,
      acceptRate,
      leads7d,
      leadsThisMonth,
      leadsLastMonth,
      sourceBreakdown,
    },
    viewsByDay: views || [],
    billing: billing || [],
    reviews: approvedReviews,
    weeklyEnquiries,
    profileCompleteness: {
      score: completeness.score,
      missingFields: completeness.missingFields,
      // Wizard model: per-step rollup + the next best action.
      steps: completeness.steps,
      nextStep: completeness.nextStep,
    },
  });
}

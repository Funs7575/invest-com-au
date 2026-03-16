import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getAdvisorId(request: NextRequest): Promise<number | null> {
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.professional_id;
}

export async function GET(request: NextRequest) {
  const advisorId = await getAdvisorId(request);
  if (!advisorId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = await createClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000).toISOString();

  const [
    { data: advisor },
    { data: leads },
    { data: billing },
    { data: views },
    { data: reviews },
    { data: bookings },
  ] = await Promise.all([
    // Advisor profile (for completeness check + billing)
    supabase
      .from("professionals")
      .select(
        "id, name, slug, firm_name, email, photo_url, type, location_display, rating, review_count, verified, bio, specialties, fee_structure, fee_description, website, phone, booking_link, booking_intro, credit_balance_cents, lead_price_cents, free_leads_used"
      )
      .eq("id", advisorId)
      .single(),
    // All leads
    supabase
      .from("professional_leads")
      .select(
        "id, user_name, user_email, user_phone, message, source_page, status, quality_score, advisor_notes, contacted_at, converted_at, created_at"
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
    // Bookings count (for booking clicks stat)
    supabase
      .from("advisor_bookings")
      .select("id, created_at")
      .eq("professional_id", advisorId)
      .gte("created_at", thirtyDaysAgo),
  ]);

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

  // --- Profile completeness ---
  const profileFields = [
    { key: "photo_url", label: "Profile photo", weight: 20 },
    { key: "bio", label: "Bio / About", weight: 20 },
    { key: "specialties", label: "Specialties", weight: 15 },
    { key: "fee_structure", label: "Fee structure", weight: 10 },
    { key: "fee_description", label: "Fee description", weight: 10 },
    { key: "website", label: "Website URL", weight: 5 },
    { key: "phone", label: "Phone number", weight: 10 },
    { key: "booking_link", label: "Booking link", weight: 10 },
  ];

  let completenessScore = 0;
  const missingFields: string[] = [];
  for (const field of profileFields) {
    const val = advisor?.[field.key as keyof typeof advisor];
    const hasValue =
      val !== null &&
      val !== undefined &&
      val !== "" &&
      !(Array.isArray(val) && val.length === 0);
    if (hasValue) {
      completenessScore += field.weight;
    } else {
      missingFields.push(field.label);
    }
  }

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
    },
    viewsByDay: views || [],
    billing: billing || [],
    reviews: approvedReviews,
    weeklyEnquiries,
    profileCompleteness: {
      score: completenessScore,
      missingFields,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
// Per-key auth gating — see /api/v1/brokers/route.ts for the same reasoning.
export const dynamic = "force-dynamic";

const log = logger("api-v1-advisor-slug");

/**
 * Public fields for a single advisor profile.
 * Superset of the list route fields — adds FAQs, education, testimonials,
 * intro video, and the ideal-client description that the profile page renders.
 * Still excludes PII (email, phone) and all billing/admin/internal fields.
 */
const PUBLIC_FIELDS = [
  "id",
  "slug",
  "name",
  "firm_name",
  "type",
  "specialties",
  "location_state",
  "location_suburb",
  "location_display",
  "location_postcode",
  "afsl_number",
  "acn",
  "abn",
  "bio",
  "photo_url",
  "website",
  "linkedin_url",
  "fee_structure",
  "fee_description",
  "hourly_rate_cents",
  "flat_fee_cents",
  "aum_percentage",
  "initial_consultation_free",
  "min_investment_cents",
  "min_client_balance_cents",
  "rating",
  "review_count",
  "verified",
  "status",
  "languages",
  "service_areas",
  "meeting_types",
  "qualifications",
  "years_experience",
  "memberships",
  "education",
  "faqs",
  "ideal_client",
  "accepting_new_clients",
  "accepts_new_clients",
  "availability_status",
  "accepts_international_clients",
  "international_tax_specialist",
  "firb_specialist",
  "migration_agent",
  "intro_video_url",
  "intro_video_poster_url",
  "offer_text",
  "offer_active",
  // Stockbroker firm fields
  "firm_type",
  "minimum_investment_cents",
  "fee_model",
  "service_tiers",
  "research_offering",
  "year_founded",
  "office_states",
  "aum_aud_billions",
  "updated_at",
  "created_at",
] as const;

/**
 * Sanitize an advisor row: keep only public fields, escape string values.
 */
function sanitizeAdvisor(row: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const field of PUBLIC_FIELDS) {
    if (field in row) {
      const val = row[field];
      clean[field] = typeof val === "string" ? escapeHtml(val) : val;
    }
  }
  return clean;
}

/**
 * OPTIONS /api/v1/advisors/[slug] — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/advisors/[slug]
 *
 * Returns a single advisor's full public profile by slug.
 * Includes recent professional reviews (last 10, approved only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const start = Date.now();
  const { slug } = await params;

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: `/api/v1/advisors/${slug}`,
      method: "GET",
      statusCode: 401,
      responseTimeMs: elapsed,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      { error: auth.error },
      { status: 401, headers: API_CORS_HEADERS },
    );
  }

  // Validate slug format
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Invalid advisor slug" },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  try {
    // professionals + professional_reviews are both covered by anon RLS
    // policies for active/approved rows — the server client (not admin) suffices.
    const supabase = await createClient();

    // Fetch advisor
    const { data: advisor, error: advisorError } = await supabase
      .from("professionals")
      .select(PUBLIC_FIELDS.join(","))
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (advisorError || !advisor) {
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: `/api/v1/advisors/${slug}`,
        method: "GET",
        statusCode: 404,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Advisor not found" },
        { status: 404, headers: API_CORS_HEADERS },
      );
    }

    // Fetch recent approved reviews (public — shown on the profile page)
    const { data: reviews } = await supabase
      .from("professional_reviews")
      .select(
        "id, rating, headline, body, reviewer_name, created_at",
      )
      .eq("professional_id", (advisor as Record<string, unknown>).id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);

    // Sanitize
    const sanitized = sanitizeAdvisor(advisor as unknown as Record<string, unknown>);

    // Sanitize reviews — only safe public fields, escape strings
    const sanitizedReviews = (reviews || []).map((r) => ({
      id: r.id,
      rating: r.rating,
      headline: typeof r.headline === "string" ? escapeHtml(r.headline) : r.headline,
      body: typeof r.body === "string" ? escapeHtml(r.body) : r.body,
      reviewer_name: typeof r.reviewer_name === "string" ? escapeHtml(r.reviewer_name) : r.reviewer_name,
      created_at: r.created_at,
    }));

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: `/api/v1/advisors/${slug}`,
      method: "GET",
      statusCode: 200,
      responseTimeMs: elapsed,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      {
        data: {
          ...sanitized,
          reviews: sanitizedReviews,
        },
      },
      {
        status: 200,
        headers: {
          ...API_CORS_HEADERS,
          "Cache-Control": "private, max-age=3600",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error in GET /api/v1/advisors/[slug]", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: `/api/v1/advisors/${slug}`,
      method: "GET",
      statusCode: 500,
      responseTimeMs: elapsed,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }
}

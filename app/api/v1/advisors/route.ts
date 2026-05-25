import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
// Per-key auth gating — see /api/v1/brokers/route.ts for the same reasoning.
export const dynamic = "force-dynamic";

const log = logger("api-v1-advisors");

/**
 * Fields safe to expose via the public API.
 * Matches what /advisor/[slug] already renders publicly.
 * Excludes PII (email, phone), billing/payment (stripe_customer_id,
 * credit_balance_cents, etc.), admin fields (admin_notes, admin_tags,
 * health_status), and lead/billing counters (total_leads, etc.).
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
  "afsl_number",
  "bio",
  "photo_url",
  "website",
  "fee_structure",
  "fee_description",
  "hourly_rate_cents",
  "flat_fee_cents",
  "aum_percentage",
  "initial_consultation_free",
  "min_investment_cents",
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
  "accepting_new_clients",
  "accepts_new_clients",
  "availability_status",
  "ideal_client",
  "accepts_international_clients",
  "international_tax_specialist",
  "firb_specialist",
  "migration_agent",
  // Stockbroker firm fields
  "firm_type",
  "minimum_investment_cents",
  "fee_model",
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
 * OPTIONS /api/v1/advisors — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/advisors
 *
 * Returns active advisors/professionals with public fields only.
 *
 * Query params:
 *   ?type=financial_planner       — filter by professional type
 *   ?location_state=NSW           — filter by state
 *   ?verified=true                — filter verified advisors
 *   ?accepts_new_clients=true     — filter by new-client availability
 *   ?limit=20                     — max results (default 20, max 100)
 *   ?offset=0                     — pagination offset
 *
 * Response: { data: Advisor[], meta: { total, limit, offset, updated_at } }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/advisors",
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

  try {
    const params = request.nextUrl.searchParams;

    // Parse pagination
    let limit = Math.min(parseInt(params.get("limit") || "20", 10) || 20, 100);
    if (limit < 1) limit = 20;
    let offset = parseInt(params.get("offset") || "0", 10) || 0;
    if (offset < 0) offset = 0;

    // professionals table has anon SELECT policy for active rows covered
    // by the public RLS policy — createClient (not admin) is correct here,
    // matching how the public /advisors page fetches.
    const supabase = await createClient();

    let query = supabase
      .from("professionals")
      .select(PUBLIC_FIELDS.join(","), { count: "exact" })
      .eq("status", "active")
      .order("rating", { ascending: false })
      .order("name", { ascending: true });

    // Apply filters
    const type = params.get("type");
    if (type) {
      query = query.eq("type", type);
    }

    const locationState = params.get("location_state");
    if (locationState) {
      query = query.eq("location_state", locationState);
    }

    const verified = params.get("verified");
    if (verified === "true") {
      query = query.eq("verified", true);
    } else if (verified === "false") {
      query = query.eq("verified", false);
    }

    const acceptsNew = params.get("accepts_new_clients");
    if (acceptsNew === "true") {
      query = query.eq("accepts_new_clients", true);
    } else if (acceptsNew === "false") {
      query = query.eq("accepts_new_clients", false);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: advisors, count, error } = await query;

    if (error) {
      log.error("Failed to fetch advisors", { error: error.message });
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/advisors",
        method: "GET",
        statusCode: 500,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch advisors" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    // Sanitize each advisor row
    const sanitized = (advisors || []).map((a) =>
      sanitizeAdvisor(a as unknown as Record<string, unknown>),
    );

    // Most recent updated_at across returned rows
    const latestUpdate =
      sanitized.reduce((latest: string, a) => {
        const u = (a.updated_at as string) || "";
        return u > latest ? u : latest;
      }, "") || new Date().toISOString();

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/advisors",
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
        data: sanitized,
        meta: {
          total: count ?? sanitized.length,
          limit,
          offset,
          updated_at: latestUpdate,
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
    log.error("Unexpected error in GET /api/v1/advisors", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/advisors",
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

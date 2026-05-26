/**
 * GET /api/v1/cohort-report
 *
 * Investor-intent cohort report: returns aggregate, anonymised cohort data
 * compiled from weekly quiz completion and lead-capture signals.
 *
 * Use this endpoint to:
 *  - Understand the distribution of investor intent across AU markets.
 *  - Benchmark your own user base against the broader invest.com.au audience.
 *  - Track intent trends over time (data matures meaningfully at ~6 months).
 *
 * No PII is returned — all data is pre-aggregated and anonymised.
 * Cohort dimensions: inferred_vertical × experience_level × investment_range.
 *
 * Query params:
 *   ?vertical=broker-seeker  — filter to a specific inferred vertical
 *   ?weeks=12                — number of weekly snapshots to return (default 12, max 52)
 *
 * Requires API key. Available to Enterprise tier only.
 *
 * Response: { cohorts: CohortSnapshot[], meta: { weeks, updated_at, disclaimer } }
 *
 * NOTE: This endpoint returns meaningful trend data after ~6 months of
 * accumulation. Early snapshots reflect low sample sizes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-cohort-report");

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const start = Date.now();

  const auth = await validateApiKey(request, "/api/v1/cohort-report");
  if (!auth.valid) {
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/cohort-report",
      method: "GET",
      statusCode: 401,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json({ error: auth.error }, { status: 401, headers: API_CORS_HEADERS });
  }

  // Enterprise-only
  if (auth.apiKey?.tier !== "enterprise") {
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/cohort-report",
      method: "GET",
      statusCode: 403,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      {
        error:
          "The cohort report endpoint requires an Enterprise API plan. Contact api@invest.com.au to discuss enterprise access.",
      },
      { status: 403, headers: API_CORS_HEADERS },
    );
  }

  try {
    const params = request.nextUrl.searchParams;

    let weeks = Math.min(parseInt(params.get("weeks") || "12", 10) || 12, 52);
    if (weeks < 1) weeks = 12;
    const verticalFilter = params.get("vertical") ?? null;

    const supabase = createAdminClient();

    // Compute the cutoff date: `weeks` Monday-starts ago
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - weeks * 7);
    const cutoff = cutoffDate.toISOString().slice(0, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("investor_cohort_snapshots")
      .select(
        "week_start, inferred_vertical, experience_level, investment_range, quiz_completions, leads_captured, conversion_rate, top_utm_source, computed_at",
      )
      .gte("week_start", cutoff)
      .order("week_start", { ascending: false })
      .order("quiz_completions", { ascending: false });

    if (verticalFilter) {
      query = query.eq("inferred_vertical", verticalFilter);
    }

    const { data: cohorts, error } = await query;

    if (error) {
      log.error("Failed to fetch cohort report", { error: error.message });
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/cohort-report",
        method: "GET",
        statusCode: 500,
        responseTimeMs: Date.now() - start,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch cohort report" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const rows = cohorts ?? [];
    const updatedAt = rows[0]?.computed_at as string | undefined;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/cohort-report",
      method: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      {
        cohorts: rows,
        meta: {
          weeks,
          total_rows: rows.length,
          updated_at: updatedAt ?? null,
          disclaimer:
            "Aggregate anonymised data derived from quiz completions and lead captures on invest.com.au. No personally identifiable information is included. Data is refreshed weekly. Trends are more meaningful after 6+ months of accumulation.",
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
    log.error("Unexpected error in GET /api/v1/cohort-report", { error: msg });
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/cohort-report",
      method: "GET",
      statusCode: 500,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-compare");

const MAX_COMPARE = 5;

/**
 * Public fields safe to expose in comparison data.
 */
const PUBLIC_FIELDS = [
  "id",
  "name",
  "slug",
  "tagline",
  "asx_fee",
  "asx_fee_value",
  "us_fee",
  "us_fee_value",
  "fx_rate",
  "chess_sponsored",
  "smsf_support",
  "is_crypto",
  "platform_type",
  "rating",
  "inactivity_fee",
  "min_deposit",
  "markets",
  "regulated_by",
  "year_founded",
  "headquarters",
  "fee_verified_date",
  "status",
  "pros",
  "cons",
  "payment_methods",
  "platforms",
  "deal",
  "deal_text",
  "editors_pick",
  "icon",
  "color",
  "updated_at",
] as const;

/**
 * Sanitize a broker row for public API output.
 */
function sanitizeBroker(row: Record<string, unknown>): Record<string, unknown> {
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
 * OPTIONS /api/v1/compare — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/compare?slugs=stake,selfwealth,commsec
 *
 * Returns side-by-side comparison data for up to 5 brokers.
 * Slugs are comma-separated.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/compare",
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
    const slugsParam = request.nextUrl.searchParams.get("slugs");

    if (!slugsParam) {
      return NextResponse.json(
        { error: "Missing required parameter: slugs (comma-separated broker slugs)" },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    // Parse and validate slugs
    const rawSlugs = slugsParam.split(",").map((s) => s.trim().toLowerCase());
    const validSlugs = rawSlugs.filter((s) => /^[a-z0-9-]+$/.test(s) && s.length > 0);

    if (validSlugs.length === 0) {
      return NextResponse.json(
        { error: "No valid broker slugs provided" },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    if (validSlugs.length > MAX_COMPARE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_COMPARE} brokers per comparison` },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    // Deduplicate
    const uniqueSlugs = [...new Set(validSlugs)];

    const supabase = createAdminClient();

    const { data: brokers, error } = await supabase
      .from("brokers")
      .select(PUBLIC_FIELDS.join(","))
      .in("slug", uniqueSlugs)
      .eq("status", "active");

    if (error) {
      log.error("Failed to fetch brokers for comparison", {
        error: error.message,
      });
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/compare",
        method: "GET",
        statusCode: 500,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch brokers" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    if (!brokers || brokers.length === 0) {
      return NextResponse.json(
        { error: "No matching brokers found" },
        { status: 404, headers: API_CORS_HEADERS },
      );
    }

    // Sanitize and order by the original slug order
    const sanitized = (brokers as unknown as Record<string, unknown>[]).map(sanitizeBroker);
    const ordered = uniqueSlugs
      .map((slug) => sanitized.find((b) => b.slug === slug))
      .filter(Boolean);

    // Identify slugs that were requested but not found
    const foundSlugs = new Set(ordered.map((b) => b!.slug as string));
    const notFound = uniqueSlugs.filter((s) => !foundSlugs.has(s));

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/compare",
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
        data: ordered,
        meta: {
          requested: uniqueSlugs,
          found: ordered.length,
          ...(notFound.length > 0 && { not_found: notFound }),
        },
      },
      {
        status: 200,
        headers: {
          ...API_CORS_HEADERS,
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error in GET /api/v1/compare", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/compare",
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

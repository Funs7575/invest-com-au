import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-brokers");

/**
 * Fields that are safe to expose via the public API.
 * Anything not on this list is stripped from the response.
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
 * Sanitize a broker row: keep only public fields, escape string values.
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
 * OPTIONS /api/v1/brokers — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/brokers
 *
 * Returns all active brokers with public fields only.
 *
 * Query params:
 *   ?platform_type=share_broker   — filter by platform type
 *   ?chess_sponsored=true         — filter by CHESS sponsorship
 *   ?smsf_support=true            — filter by SMSF support
 *   ?is_crypto=true               — filter crypto exchanges
 *   ?limit=20                     — max results (default 20, max 100)
 *   ?offset=0                     — pagination offset
 *
 * Response: { data: Broker[], meta: { total, limit, offset, updated_at } }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/brokers",
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

    const supabase = createAdminClient();

    // Build query — select only public fields
    let query = supabase
      .from("brokers")
      .select(PUBLIC_FIELDS.join(","), { count: "exact" })
      .eq("status", "active")
      .order("name", { ascending: true });

    // Apply filters
    const platformType = params.get("platform_type");
    if (platformType) {
      query = query.eq("platform_type", platformType);
    }

    const chessSponsored = params.get("chess_sponsored");
    if (chessSponsored === "true") {
      query = query.eq("chess_sponsored", true);
    } else if (chessSponsored === "false") {
      query = query.eq("chess_sponsored", false);
    }

    const smsfSupport = params.get("smsf_support");
    if (smsfSupport === "true") {
      query = query.eq("smsf_support", true);
    } else if (smsfSupport === "false") {
      query = query.eq("smsf_support", false);
    }

    const isCrypto = params.get("is_crypto");
    if (isCrypto === "true") {
      query = query.eq("is_crypto", true);
    } else if (isCrypto === "false") {
      query = query.eq("is_crypto", false);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: brokers, count, error } = await query;

    if (error) {
      log.error("Failed to fetch brokers", { error: error.message });
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/brokers",
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

    // Sanitize each broker row
    const sanitized = (brokers || []).map((b) =>
      sanitizeBroker(b as unknown as Record<string, unknown>),
    );

    // Find the most recent updated_at across all returned brokers
    const latestUpdate =
      sanitized.reduce((latest: string, b) => {
        const u = (b.updated_at as string) || "";
        return u > latest ? u : latest;
      }, "") || new Date().toISOString();

    const elapsed = Date.now() - start;

    // Log request
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/brokers",
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
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error in GET /api/v1/brokers", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/brokers",
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

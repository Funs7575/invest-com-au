import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
// Per-key auth gating — see /api/v1/brokers/route.ts for the same reasoning.
export const dynamic = "force-dynamic";

const log = logger("api-v1-robo-advisors");

/**
 * Public fields for robo-advisor platform rows.
 * Excludes: affiliate_url, commission fields, internal admin data.
 */
const PUBLIC_FIELDS = [
  "id",
  "name",
  "slug",
  "tagline",
  "platform_type",
  "rating",
  "min_deposit",
  "regulated_by",
  "year_founded",
  "headquarters",
  "fee_verified_date",
  "status",
  "pros",
  "cons",
  "deal",
  "deal_text",
  "editors_pick",
  "icon",
  "color",
  "updated_at",
] as const;

/**
 * Sanitize a robo-advisor row: keep only public fields, escape strings.
 */
function sanitizePlatform(
  row: Record<string, unknown>,
): Record<string, unknown> {
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
 * OPTIONS /api/v1/robo-advisors — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/robo-advisors
 *
 * Returns active robo-advisor platforms (platform_type = 'robo_advisor').
 * Robo-advisors are automated investment services backed by real brokers/platforms
 * in the brokers table (Raiz, Stockspot, Spaceship, InvestSMART, Six Park, etc.).
 *
 * Query params:
 *   ?smsf_support=true   — filter by SMSF support (true/false)
 *   ?limit=20            — max results (default 20, max 100)
 *   ?offset=0            — pagination offset
 *
 * Response: { data: RoboAdvisor[], meta: { total, limit, offset, updated_at } }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/robo-advisors",
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

    const supabase = await createClient();

    let query = supabase
      .from("brokers")
      .select(PUBLIC_FIELDS.join(","), { count: "exact" })
      .eq("status", "active")
      .eq("platform_type", "robo_advisor")
      .order("rating", { ascending: false })
      .order("name", { ascending: true });

    // Optional SMSF filter
    const smsfSupport = params.get("smsf_support");
    if (smsfSupport === "true") {
      query = query.eq("smsf_support", true);
    } else if (smsfSupport === "false") {
      query = query.eq("smsf_support", false);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: platforms, count, error } = await query;

    if (error) {
      log.error("Failed to fetch robo-advisors", { error: error.message });
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/robo-advisors",
        method: "GET",
        statusCode: 500,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch robo-advisors" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const sanitized = (platforms || []).map((p) =>
      sanitizePlatform(p as unknown as Record<string, unknown>),
    );

    const latestUpdate =
      sanitized.reduce((latest: string, p) => {
        const u = (p.updated_at as string) || "";
        return u > latest ? u : latest;
      }, "") || new Date().toISOString();

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/robo-advisors",
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
    log.error("Unexpected error in GET /api/v1/robo-advisors", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/robo-advisors",
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

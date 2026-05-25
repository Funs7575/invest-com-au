import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
// Per-key auth gating — see /api/v1/brokers/route.ts for the same reasoning.
export const dynamic = "force-dynamic";

const log = logger("api-v1-health-scores");

/**
 * Public fields from broker_health_scores.
 * Excludes: id (internal), created_at (non-informative for consumers).
 * The notes fields are factual regulatory/operational data — safe to expose
 * under the existing general-advice AFSL since this is informational only.
 */
const PUBLIC_FIELDS = [
  "broker_slug",
  "afsl_number",
  "afsl_status",
  "overall_score",
  "regulatory_score",
  "regulatory_notes",
  "financial_stability_score",
  "financial_stability_notes",
  "client_money_score",
  "client_money_notes",
  "insurance_score",
  "insurance_notes",
  "platform_reliability_score",
  "platform_reliability_notes",
  "last_reviewed_at",
  "updated_at",
] as const;

/**
 * Sanitize a health score row.
 */
function sanitizeScore(row: Record<string, unknown>): Record<string, unknown> {
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
 * OPTIONS /api/v1/health-scores — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/health-scores
 *
 * Returns current broker health scores. Each row reflects the latest
 * health assessment across five dimensions: regulatory, financial stability,
 * client money, insurance, and platform reliability.
 *
 * Scores are numeric 0–100. This is factual/informational data — not financial
 * advice or a recommendation to use or avoid any broker.
 *
 * Query params:
 *   ?broker_slug=stake        — filter to a specific broker
 *   ?min_score=70             — only return brokers with overall_score >= this
 *   ?limit=20                 — max results (default 20, max 100)
 *   ?offset=0                 — pagination offset
 *
 * Response: { data: HealthScore[], meta: { total, limit, offset, updated_at } }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/health-scores",
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

    // broker_health_scores has anon SELECT policy — createClient suffices.
    let query = supabase
      .from("broker_health_scores")
      .select(PUBLIC_FIELDS.join(","), { count: "exact" })
      .order("overall_score", { ascending: false })
      .order("broker_slug", { ascending: true });

    // Optional filters
    const brokerSlug = params.get("broker_slug");
    if (brokerSlug) {
      query = query.eq("broker_slug", brokerSlug);
    }

    const minScoreParam = params.get("min_score");
    if (minScoreParam) {
      const minScore = parseFloat(minScoreParam);
      if (Number.isFinite(minScore)) {
        query = query.gte("overall_score", minScore);
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data: scores, count, error } = await query;

    if (error) {
      log.error("Failed to fetch health scores", { error: error.message });
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/health-scores",
        method: "GET",
        statusCode: 500,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch health scores" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const sanitized = (scores || []).map((s) =>
      sanitizeScore(s as unknown as Record<string, unknown>),
    );

    const latestUpdate =
      sanitized.reduce((latest: string, s) => {
        const u = (s.updated_at as string) || "";
        return u > latest ? u : latest;
      }, "") || new Date().toISOString();

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/health-scores",
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
          disclaimer:
            "Health scores are informational only. They reflect publicly available regulatory and operational data. This is not financial advice.",
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
    log.error("Unexpected error in GET /api/v1/health-scores", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/health-scores",
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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
// Per-key auth gating — see /api/v1/brokers/route.ts for the same reasoning.
export const dynamic = "force-dynamic";

const log = logger("api-v1-health-scores-history");

/**
 * Public fields from broker_health_score_history.
 * Append-only snapshot table — each row is a historical point-in-time record.
 */
const PUBLIC_FIELDS = [
  "broker_slug",
  "overall_score",
  "regulatory_score",
  "client_money_score",
  "financial_stability_score",
  "platform_reliability_score",
  "insurance_score",
  "captured_at",
] as const;

/**
 * Sanitize a history row.
 */
function sanitizeHistory(
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
 * OPTIONS /api/v1/health-scores/history — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/health-scores/history
 *
 * Returns the time-series history of broker health scores from
 * broker_health_score_history. This append-only table is populated by the
 * /api/cron/snapshot-health-scores cron job.
 *
 * Scores are numeric 0–100. This is factual/informational data — not financial
 * advice or a recommendation to use or avoid any broker.
 *
 * Query params:
 *   ?broker_slug=stake    — required: filter to a specific broker's history
 *   ?days=90              — how many days of history to return (default 90, max 400)
 *   ?limit=100            — max rows (default 100, max 400)
 *   ?offset=0             — pagination offset
 *
 * Response: { data: HealthScoreHistory[], meta: { broker_slug, total, limit, offset, updated_at } }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/health-scores/history",
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

    // broker_slug is required — without it the response would be enormous
    const brokerSlug = params.get("broker_slug");
    if (!brokerSlug || !/^[a-z0-9-]+$/.test(brokerSlug)) {
      return NextResponse.json(
        {
          error:
            "broker_slug query parameter is required (e.g. ?broker_slug=stake)",
        },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    // Parse days param (controls the captured_at cutoff)
    let days = parseInt(params.get("days") || "90", 10);
    if (!Number.isFinite(days) || days < 1) days = 90;
    if (days > 400) days = 400;

    // Parse pagination
    let limit = Math.min(parseInt(params.get("limit") || "100", 10) || 100, 400);
    if (limit < 1) limit = 100;
    let offset = parseInt(params.get("offset") || "0", 10) || 0;
    if (offset < 0) offset = 0;

    const supabase = await createClient();

    // Compute the cutoff timestamp
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // broker_health_score_history has anon SELECT policy — createClient suffices.
    const { data: history, count, error } = await supabase
      .from("broker_health_score_history")
      .select(PUBLIC_FIELDS.join(","), { count: "exact" })
      .eq("broker_slug", brokerSlug)
      .gte("captured_at", cutoff.toISOString())
      .order("captured_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      log.error("Failed to fetch health score history", {
        error: error.message,
      });
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/health-scores/history",
        method: "GET",
        statusCode: 500,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch health score history" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const sanitized = (history || []).map((h) =>
      sanitizeHistory(h as unknown as Record<string, unknown>),
    );

    const latestCapture =
      sanitized.length > 0
        ? (sanitized[0]?.captured_at as string)
        : null;

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/health-scores/history",
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
          broker_slug: brokerSlug,
          total: count ?? sanitized.length,
          limit,
          offset,
          days,
          updated_at: latestCapture ?? new Date().toISOString(),
          disclaimer:
            "Health score history is informational only. It reflects publicly available regulatory and operational data. This is not financial advice.",
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
    log.error("Unexpected error in GET /api/v1/health-scores/history", {
      error: msg,
    });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/health-scores/history",
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

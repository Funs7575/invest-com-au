import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-broker-health");

/**
 * Public columns from broker_health_scores.
 * Notes columns (regulatory_notes, etc.) are intentionally included — they
 * are editorial copy, not internal operations data.
 */
const PUBLIC_COLUMNS = [
  "broker_slug",
  "overall_score",
  "regulatory_score",
  "regulatory_notes",
  "financial_stability_score",
  "financial_stability_notes",
  "client_money_score",
  "client_money_notes",
  "platform_reliability_score",
  "platform_reliability_notes",
  "insurance_score",
  "insurance_notes",
  "afsl_number",
  "afsl_status",
  "last_reviewed_at",
  "updated_at",
] as const;

const QuerySchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens")
    .optional()
    .describe("Single broker slug — omit to return all scored brokers"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * OPTIONS /api/v1/broker-health — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/broker-health
 *
 * Returns broker health score(s) from broker_health_scores.
 *
 * Query params:
 *   ?slug=stake   — single broker; omit for paginated list of all scored brokers
 *   ?limit=20     — max results (default 20, max 100) — ignored when slug is set
 *   ?offset=0     — pagination offset — ignored when slug is set
 *
 * Single-broker response: { data: BrokerHealthScore, meta: { generated_at } }
 * List response:          { data: BrokerHealthScore[], meta: { total, limit, offset, generated_at } }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const endpoint = "/api/v1/broker-health";

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint,
      method: "GET",
      statusCode: 401,
      responseTimeMs: elapsed,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });
    return NextResponse.json(
      { error: auth.error },
      { status: 401, headers: API_CORS_HEADERS },
    );
  }

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = QuerySchema.safeParse(raw);

    if (!parsed.success) {
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id ?? null,
        endpoint,
        method: "GET",
        statusCode: 400,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown",
        userAgent: request.headers.get("user-agent") ?? "unknown",
      });
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    const { slug, limit, offset } = parsed.data;
    const supabase = createAdminClient();
    const selectCols = PUBLIC_COLUMNS.join(",");

    // ── Single-broker lookup ──
    if (slug !== undefined) {
      const { data: score, error } = await supabase
        .from("broker_health_scores")
        .select(selectCols)
        .eq("broker_slug", slug)
        .single();

      const elapsed = Date.now() - start;

      if (error || !score) {
        logApiRequest({
          apiKeyId: auth.apiKey?.id ?? null,
          endpoint,
          method: "GET",
          statusCode: 404,
          responseTimeMs: elapsed,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            "unknown",
          userAgent: request.headers.get("user-agent") ?? "unknown",
        });
        return NextResponse.json(
          { error: "Broker health score not found" },
          { status: 404, headers: API_CORS_HEADERS },
        );
      }

      logApiRequest({
        apiKeyId: auth.apiKey?.id ?? null,
        endpoint,
        method: "GET",
        statusCode: 200,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown",
        userAgent: request.headers.get("user-agent") ?? "unknown",
      });

      return NextResponse.json(
        {
          data: score,
          meta: { generated_at: new Date().toISOString() },
        },
        {
          status: 200,
          headers: {
            ...API_CORS_HEADERS,
            "Cache-Control": "private, max-age=3600",
          },
        },
      );
    }

    // ── List all scored brokers ──
    const { data: scores, count, error } = await supabase
      .from("broker_health_scores")
      .select(selectCols, { count: "exact" })
      .order("overall_score", { ascending: false })
      .range(offset, offset + limit - 1);

    const elapsed = Date.now() - start;

    if (error) {
      log.error("Failed to fetch broker health scores", {
        error: error.message,
      });
      logApiRequest({
        apiKeyId: auth.apiKey?.id ?? null,
        endpoint,
        method: "GET",
        statusCode: 500,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown",
        userAgent: request.headers.get("user-agent") ?? "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch broker health scores" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    logApiRequest({
      apiKeyId: auth.apiKey?.id ?? null,
      endpoint,
      method: "GET",
      statusCode: 200,
      responseTimeMs: elapsed,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });

    return NextResponse.json(
      {
        data: scores ?? [],
        meta: {
          total: count ?? (scores?.length ?? 0),
          limit,
          offset,
          generated_at: new Date().toISOString(),
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
    log.error("Unexpected error in GET /api/v1/broker-health", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id ?? null,
      endpoint,
      method: "GET",
      statusCode: 500,
      responseTimeMs: elapsed,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }
}

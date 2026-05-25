import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-fee-changes");

/**
 * Public columns we expose from broker_data_changes.
 * Internal columns (changed_by, auto_applied_at/tier) are withheld.
 */
const PUBLIC_COLUMNS =
  "id,broker_slug,field_name,old_value,new_value,change_type,changed_at,source" as const;

const QuerySchema = z.object({
  since: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("ISO-8601 timestamp — return changes at or after this time"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .describe("Filter to a single broker slug"),
  field_name: z
    .string()
    .regex(/^[a-z_]+$/)
    .optional()
    .describe("Filter to a specific field (e.g. asx_fee, us_fee)"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * OPTIONS /api/v1/fee-changes — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/fee-changes
 *
 * Feed of broker fee and rate changes from broker_data_changes, newest first.
 *
 * Query params:
 *   ?since=2026-01-01T00:00:00Z  — return changes at or after this ISO timestamp
 *   ?slug=stake                  — filter to a single broker
 *   ?field_name=asx_fee          — filter to a specific field
 *   ?limit=20                    — max results (default 20, max 100)
 *   ?offset=0                    — pagination offset
 *
 * Response: { data: FeeChange[], meta: { total, limit, offset, generated_at } }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const endpoint = "/api/v1/fee-changes";

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

    const { since, slug, field_name, limit, offset } = parsed.data;
    const supabase = createAdminClient();

    let query = supabase
      .from("broker_data_changes")
      .select(PUBLIC_COLUMNS, { count: "exact" })
      .order("changed_at", { ascending: false });

    if (since) {
      query = query.gte("changed_at", since);
    }
    if (slug) {
      query = query.eq("broker_slug", slug);
    }
    if (field_name) {
      query = query.eq("field_name", field_name);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: changes, count, error } = await query;

    if (error) {
      log.error("Failed to fetch fee changes", { error: error.message });
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
        { error: "Failed to fetch fee changes" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const elapsed = Date.now() - start;

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

    // Defense-in-depth: re-project each row to the public shape so internal
    // columns (changed_by, auto_applied_*) can never leak through this public
    // endpoint even if the query returns extra fields (a view change or a
    // select("*") regression). The PUBLIC_COLUMNS projection is the first line;
    // this is the second.
    const data = (changes ?? []).map((c) => {
      const row = c as Record<string, unknown>;
      return {
        id: row.id,
        broker_slug: row.broker_slug,
        field_name: row.field_name,
        old_value: row.old_value,
        new_value: row.new_value,
        change_type: row.change_type,
        changed_at: row.changed_at,
        source: row.source,
      };
    });

    return NextResponse.json(
      {
        data,
        meta: {
          total: count ?? (changes?.length ?? 0),
          limit,
          offset,
          generated_at: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          ...API_CORS_HEADERS,
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error in GET /api/v1/fee-changes", { error: msg });
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

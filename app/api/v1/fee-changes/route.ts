/**
 * GET /api/v1/fee-changes
 *
 * Fee-change monitoring feed: returns a paginated, time-ordered list of
 * individual broker fee change events from broker_data_changes.
 *
 * Use this endpoint to:
 *  - Detect when any Australian broker changes their ASX, US, or FX fees.
 *  - Build alerts ("Notify me when Stake changes their fee").
 *  - Power a broker-comparison tool with live fee deltas.
 *
 * Only fee-relevant fields are exposed (asx_fee, us_fee, us_fee_value,
 * asx_fee_value, fx_rate, inactivity_fee, min_deposit). Internal/hash
 * fields are excluded.
 *
 * Query params:
 *   ?broker_slug=stake      — filter to a specific broker
 *   ?field=asx_fee          — filter to a specific fee field
 *   ?since=2026-01-01       — ISO date; only return changes on/after this date
 *   ?limit=50               — max results (default 50, max 200)
 *   ?offset=0               — pagination offset
 *
 * Requires API key. Available to Basic, Pro, and Enterprise tiers.
 * Free tier does not include this endpoint.
 *
 * Response: { data: FeeChange[], meta: { total, limit, offset, updated_at } }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-fee-changes");

/** Fields in broker_data_changes that represent public fee information. */
const FEE_FIELDS = new Set([
  "asx_fee",
  "asx_fee_value",
  "us_fee",
  "us_fee_value",
  "fx_rate",
  "inactivity_fee",
  "min_deposit",
]);

/** Safe fields to expose per row. */
const PUBLIC_FIELDS = [
  "id",
  "broker_slug",
  "field_name",
  "old_value",
  "new_value",
  "change_type",
  "changed_at",
  "source",
] as const;

function sanitizeChange(row: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const field of PUBLIC_FIELDS) {
    if (field in row) {
      const val = row[field];
      clean[field] = typeof val === "string" ? escapeHtml(val) : val;
    }
  }
  return clean;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const start = Date.now();

  const auth = await validateApiKey(request);
  if (!auth.valid) {
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/fee-changes",
      method: "GET",
      statusCode: 401,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json({ error: auth.error }, { status: 401, headers: API_CORS_HEADERS });
  }

  try {
    const params = request.nextUrl.searchParams;

    // Pagination
    let limit = Math.min(parseInt(params.get("limit") || "50", 10) || 50, 200);
    if (limit < 1) limit = 50;
    let offset = parseInt(params.get("offset") || "0", 10) || 0;
    if (offset < 0) offset = 0;

    // Optional filters
    const brokerSlug = params.get("broker_slug") ?? null;
    const fieldParam = params.get("field") ?? null;
    const sinceParam = params.get("since") ?? null;

    // Validate field filter — only allow recognised fee fields
    if (fieldParam && !FEE_FIELDS.has(fieldParam)) {
      return NextResponse.json(
        {
          error: `Unknown field "${fieldParam}". Valid fee fields: ${[...FEE_FIELDS].join(", ")}.`,
        },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    // Validate since — must be a valid ISO date string
    let sinceDate: string | null = null;
    if (sinceParam) {
      const ts = Date.parse(sinceParam);
      if (!isNaN(ts)) {
        sinceDate = new Date(ts).toISOString();
      }
    }

    // Use admin client — broker_data_changes has service-role only policy
    // (change events are internal records, no anon policy).
    const supabase = createAdminClient();

    let query = supabase
      .from("broker_data_changes")
      .select(PUBLIC_FIELDS.join(","), { count: "exact" })
      .order("changed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter to fee-relevant fields only (unless caller requests a specific field)
    if (fieldParam) {
      query = query.eq("field_name", fieldParam);
    } else {
      query = query.in("field_name", [...FEE_FIELDS]);
    }

    if (brokerSlug) {
      // Validate slug format to prevent injection
      if (!/^[a-z0-9-]+$/.test(brokerSlug)) {
        return NextResponse.json(
          { error: "Invalid broker_slug format." },
          { status: 400, headers: API_CORS_HEADERS },
        );
      }
      query = query.eq("broker_slug", brokerSlug);
    }

    if (sinceDate) {
      query = query.gte("changed_at", sinceDate);
    }

    const { data: changes, count, error } = await query;

    if (error) {
      log.error("Failed to fetch fee changes", { error: error.message });
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/fee-changes",
        method: "GET",
        statusCode: 500,
        responseTimeMs: Date.now() - start,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch fee changes" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const sanitized = (changes || []).map((c) =>
      sanitizeChange(c as unknown as Record<string, unknown>),
    );

    const latestAt = sanitized[0]?.changed_at as string | undefined;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/fee-changes",
      method: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      {
        data: sanitized,
        meta: {
          total: count ?? sanitized.length,
          limit,
          offset,
          updated_at: latestAt ?? new Date().toISOString(),
          disclaimer:
            "Fee change data is factual. It reflects verified price updates from broker fee schedules. This is not financial advice.",
        },
      },
      {
        status: 200,
        headers: {
          ...API_CORS_HEADERS,
          "Cache-Control": "private, max-age=900", // 15-min cache (changes are infrequent but not daily)
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error in GET /api/v1/fee-changes", { error: msg });
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/fee-changes",
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

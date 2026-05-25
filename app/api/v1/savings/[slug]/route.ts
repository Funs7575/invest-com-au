import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-savings-slug");

/**
 * Public fields for a single savings platform detail response.
 * Includes additional review/content fields beyond the list endpoint.
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
  "review_content",
  "updated_at",
] as const;

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

function sanitizeRate(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    product_kind: row.product_kind,
    rate_bps: row.rate_bps,
    intro_rate_bps: row.intro_rate_bps,
    intro_term_months: row.intro_term_months,
    min_balance_cents: row.min_balance_cents,
    max_balance_cents: row.max_balance_cents,
    term_months: row.term_months,
    captured_at: row.captured_at,
    notes:
      typeof row.notes === "string" ? escapeHtml(row.notes) : row.notes,
  };
}

/**
 * OPTIONS /api/v1/savings/[slug] — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/savings/[slug]
 *
 * Returns a single savings platform's full public profile by slug.
 * Includes all current rate snapshots and rate history (last 30 per product_kind).
 *
 * Rate fields use basis points (bps): 525 bps = 5.25% p.a.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const start = Date.now();
  const { slug } = await params;

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: `/api/v1/savings/${slug}`,
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

  // Validate slug format
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Invalid savings platform slug" },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  try {
    const supabase = await createClient();

    // Fetch the savings platform
    const { data: platform, error: platformError } = await supabase
      .from("brokers")
      .select(PUBLIC_FIELDS.join(","))
      .eq("slug", slug)
      .eq("status", "active")
      .in("platform_type", ["savings", "term_deposit"])
      .single();

    if (platformError || !platform) {
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: `/api/v1/savings/${slug}`,
        method: "GET",
        statusCode: 404,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Savings platform not found" },
        { status: 404, headers: API_CORS_HEADERS },
      );
    }

    const platformRow = platform as unknown as Record<string, unknown>;

    // Fetch rate history (last 30 snapshots per product_kind, most recent first)
    const { data: rates } = await supabase
      .from("savings_rate_snapshots")
      .select(
        "id, broker_id, product_kind, rate_bps, intro_rate_bps, intro_term_months, min_balance_cents, max_balance_cents, term_months, captured_at, notes",
      )
      .eq("broker_id", platformRow.id as number)
      .order("captured_at", { ascending: false })
      .limit(60); // 30 per kind × 2 kinds max

    // Group by product_kind, take last 30 per kind
    const ratesByKind: Record<string, Record<string, unknown>[]> = {};
    for (const rate of rates || []) {
      const r = rate as Record<string, unknown>;
      const kind = r.product_kind as string;
      if (!ratesByKind[kind]) ratesByKind[kind] = [];
      if ((ratesByKind[kind]?.length ?? 0) < 30) {
        ratesByKind[kind]!.push(sanitizeRate(r));
      }
    }

    const sanitized = sanitizePlatform(platformRow);

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: `/api/v1/savings/${slug}`,
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
        data: {
          ...sanitized,
          rates_by_kind: ratesByKind,
          rate_note:
            "rate_bps: integer basis points — 525 bps = 5.25% p.a. Intro rates are time-limited bonus rates.",
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
    log.error("Unexpected error in GET /api/v1/savings/[slug]", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: `/api/v1/savings/${slug}`,
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

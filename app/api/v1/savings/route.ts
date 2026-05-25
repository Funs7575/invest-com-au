import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
// Per-key auth gating — see /api/v1/brokers/route.ts for the same reasoning.
export const dynamic = "force-dynamic";

const log = logger("api-v1-savings");

/**
 * Public fields safe to expose for savings/term-deposit platform rows.
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
 * Sanitize a savings platform row: keep only public fields, escape strings.
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
 * Sanitize a rate snapshot row.
 */
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
 * OPTIONS /api/v1/savings — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/savings
 *
 * Returns active savings account and term deposit platforms with the latest
 * rate snapshot for each (joined from savings_rate_snapshots).
 *
 * Query params:
 *   ?product_kind=savings_account   — filter by kind: savings_account | term_deposit
 *   ?limit=20                       — max results (default 20, max 100)
 *   ?offset=0                       — pagination offset
 *
 * Response: { data: SavingsPlatform[], meta: { total, limit, offset, updated_at } }
 *
 * Rate fields use basis points (bps): 525 bps = 5.25% p.a.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/savings",
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

    // Build query — brokers with savings/term_deposit platform types.
    // platform_type can be either 'savings' (the original CHECK constraint value)
    // or matched via product_kind filter on savings_rate_snapshots.
    let query = supabase
      .from("brokers")
      .select(PUBLIC_FIELDS.join(","), { count: "exact" })
      .eq("status", "active")
      .in("platform_type", ["savings", "term_deposit"])
      .order("rating", { ascending: false })
      .order("name", { ascending: true });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: platforms, count, error } = await query;

    if (error) {
      log.error("Failed to fetch savings platforms", { error: error.message });
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/savings",
        method: "GET",
        statusCode: 500,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch savings platforms" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const platformRows = platforms || [];

    // For each platform, fetch the latest rate snapshots from savings_rate_snapshots.
    // Apply product_kind filter if requested.
    const productKindFilter = params.get("product_kind");
    const validKinds = ["savings_account", "term_deposit"] as const;
    const filteredKind = validKinds.find((k) => k === productKindFilter) ?? null;

    const platformIds = platformRows
      .map((p) => (p as Record<string, unknown>).id as number)
      .filter(Boolean);

    let ratesMap: Record<number, Record<string, unknown>[]> = {};

    if (platformIds.length > 0) {
      let ratesQuery = supabase
        .from("savings_rate_snapshots")
        .select(
          "id, broker_id, product_kind, rate_bps, intro_rate_bps, intro_term_months, min_balance_cents, max_balance_cents, term_months, captured_at, notes",
        )
        .in("broker_id", platformIds)
        .order("captured_at", { ascending: false });

      if (filteredKind) {
        ratesQuery = ratesQuery.eq("product_kind", filteredKind);
      }

      const { data: rates } = await ratesQuery;

      // Group latest rate per (broker_id, product_kind) — take first per group
      const seen = new Set<string>();
      for (const rate of rates || []) {
        const r = rate as Record<string, unknown>;
        const key = `${r.broker_id as string}-${r.product_kind as string}`;
        if (!seen.has(key)) {
          seen.add(key);
          const bid = r.broker_id as number;
          if (!ratesMap[bid]) ratesMap[bid] = [];
          ratesMap[bid]!.push(sanitizeRate(r));
        }
      }
    }

    // If product_kind filter is specified and a platform has no matching rate,
    // exclude it from results (matches user intent).
    const sanitized = platformRows
      .map((p) => {
        const row = p as unknown as Record<string, unknown>;
        const clean = sanitizePlatform(row);
        const pid = row.id as number;
        const latest_rates = ratesMap[pid] ?? [];
        return { ...clean, latest_rates };
      })
      .filter((p) => !filteredKind || (p.latest_rates as unknown[]).length > 0);

    const latestUpdate =
      sanitized.reduce((latest: string, p) => {
        const u = (p.updated_at as string) || "";
        return u > latest ? u : latest;
      }, "") || new Date().toISOString();

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/savings",
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
          total: filteredKind ? sanitized.length : (count ?? sanitized.length),
          limit,
          offset,
          updated_at: latestUpdate,
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
    log.error("Unexpected error in GET /api/v1/savings", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/savings",
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

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createStaticClient } from "@/lib/supabase/static";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
// Keep force-dynamic: per-API-key allowed_endpoints + rate limits mean
// CDN sharing across keys would bypass access control. The Cache-Control
// header below uses `private` so each consumer's browser caches their
// own copy for 1h, but Vercel's shared edge cache doesn't.
export const dynamic = "force-dynamic";

const log = logger("api-v1-tax-withholding");

const ENDPOINT = "/api/v1/tax/withholding";

/**
 * Public, factual cross-border withholding-tax reference data — Double Tax
 * Agreement (DTA) rates for dividends, interest and royalties paid to foreign
 * investors. Source: ATO Tax Treaties register. Reference data only, not advice.
 *
 * Reads `fi_dta_countries` via the anon (RLS-scoped) client: the table carries a
 * `public_read_fi_dta_countries` anon SELECT policy (USING is_active = true), so
 * the service-role admin client is not appropriate here.
 */

/**
 * Columns safe to expose. Mirrors the public SELECT used by lib/fi-data-server.ts
 * (getDtaCountries) — never the raw `id`, audit timestamps or internal sort keys.
 */
const PUBLIC_SELECT =
  "country, country_code, has_dta, dividend_wht, interest_wht, royalties_wht, dta_effective_year, notes, ato_reference_url, updated_at" as const;

interface DtaCountryRow {
  country: string;
  country_code: string;
  has_dta: boolean;
  dividend_wht: number | string;
  interest_wht: number | string;
  royalties_wht: number | string;
  dta_effective_year: number | null;
  notes: string | null;
  ato_reference_url: string | null;
  updated_at: string | null;
}

/**
 * Query params. `country` accepts an ISO-3166 alpha-2 code (case-insensitive),
 * e.g. ?country=US. `has_dta` filters to treaty / no-treaty countries.
 */
const QuerySchema = z.object({
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "country must be a 2-letter ISO country code")
    .transform((s) => s.toUpperCase())
    .optional(),
  has_dta: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Shape a DTA row for the public response: keep only whitelisted fields,
 * coerce numeric WHT rates to numbers, escape free-text string values.
 */
function shapeRow(row: DtaCountryRow) {
  return {
    country: escapeHtml(row.country),
    country_code: escapeHtml(row.country_code),
    has_dta: row.has_dta,
    dividend_wht: Number(row.dividend_wht),
    interest_wht: Number(row.interest_wht),
    royalties_wht: Number(row.royalties_wht),
    dta_effective_year: row.dta_effective_year,
    notes: row.notes ? escapeHtml(row.notes) : null,
    ato_reference_url: row.ato_reference_url
      ? escapeHtml(row.ato_reference_url)
      : null,
    updated_at: row.updated_at,
  };
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

/**
 * OPTIONS /api/v1/tax/withholding — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/tax/withholding
 *
 * Returns DTA withholding rates (dividend / interest / royalty) for foreign
 * investors, per country. Public, factual ATO reference data.
 *
 * Query params:
 *   ?country=US        — filter to a single ISO alpha-2 country code
 *   ?has_dta=true      — only countries with a Double Tax Agreement
 *   ?has_dta=false     — only countries without a DTA
 *   ?limit=50          — max results (default 100, max 100)
 *   ?offset=0          — pagination offset
 *
 * Response: { data: WithholdingRate[], meta: { total, limit, offset, updated_at } }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: ENDPOINT,
      method: "GET",
      statusCode: 401,
      responseTimeMs: elapsed,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      { error: auth.error },
      { status: 401, headers: API_CORS_HEADERS },
    );
  }

  // ── Validate query params ──
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: ENDPOINT,
      method: "GET",
      statusCode: 400,
      responseTimeMs: elapsed,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.issues },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  const { country, has_dta, limit, offset } = parsed.data;

  try {
    const supabase = createStaticClient();

    let query = supabase
      .from("fi_dta_countries")
      .select(PUBLIC_SELECT, { count: "exact" })
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (country) {
      query = query.eq("country_code", country);
    }
    if (has_dta === "true") {
      query = query.eq("has_dta", true);
    } else if (has_dta === "false") {
      query = query.eq("has_dta", false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: rows, count, error } = await query;

    if (error) {
      log.error("Failed to fetch withholding rates", { error: error.message });
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: ENDPOINT,
        method: "GET",
        statusCode: 500,
        responseTimeMs: elapsed,
        ipAddress: clientIp(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to fetch withholding rates" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const data = ((rows || []) as unknown as DtaCountryRow[]).map(shapeRow);

    const latestUpdate =
      data.reduce((latest: string, r) => {
        const u = r.updated_at || "";
        return u > latest ? u : latest;
      }, "") || new Date().toISOString();

    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: ENDPOINT,
      method: "GET",
      statusCode: 200,
      responseTimeMs: elapsed,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      {
        data,
        meta: {
          total: count ?? data.length,
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
    log.error("Unexpected error in GET /api/v1/tax/withholding", {
      error: msg,
    });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: ENDPOINT,
      method: "GET",
      statusCode: 500,
      responseTimeMs: elapsed,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }
}

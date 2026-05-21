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

const log = logger("api-v1-tax-brackets");

const ENDPOINT = "/api/v1/tax/brackets";

/**
 * Public, factual Australian individual income-tax brackets for residents and
 * non-residents. Reference data only, not advice.
 *
 * Reads `fi_tax_brackets` via the anon (RLS-scoped) client: the table carries a
 * `public_read_fi_tax_brackets` anon SELECT policy (USING is_active = true), so
 * the service-role admin client is not appropriate here.
 */

/**
 * Columns safe to expose. Mirrors the public SELECT used by lib/fi-data-server.ts
 * (getNonResidentTaxBrackets) — never the raw `id` or audit timestamps beyond
 * `updated_at`.
 */
const PUBLIC_SELECT =
  "tax_year, taxpayer_type, income_from, income_to, rate, description, sort_order, updated_at" as const;

interface TaxBracketRow {
  tax_year: string;
  taxpayer_type: "non_resident" | "resident";
  income_from: number | string;
  income_to: number | string | null;
  rate: number | string;
  description: string;
  sort_order: number;
  updated_at: string | null;
}

/**
 * Query params. `residency` selects the bracket set (defaults to non_resident,
 * the foreign-investor case this hub is built around). `tax_year` filters to a
 * single financial year, e.g. ?tax_year=2025-26.
 */
const QuerySchema = z.object({
  residency: z.enum(["non_resident", "resident"]).optional(),
  tax_year: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "tax_year must look like 2025-26")
    .optional(),
});

/**
 * Shape a bracket row for the public response: coerce numerics, escape text.
 * `income_to` is null for the top (open-ended) bracket.
 */
function shapeRow(row: TaxBracketRow) {
  return {
    tax_year: escapeHtml(row.tax_year),
    taxpayer_type: row.taxpayer_type,
    income_from: Number(row.income_from),
    income_to: row.income_to === null ? null : Number(row.income_to),
    rate: Number(row.rate),
    description: escapeHtml(row.description),
    updated_at: row.updated_at,
  };
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

/**
 * OPTIONS /api/v1/tax/brackets — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/tax/brackets
 *
 * Returns Australian individual income-tax brackets. Public, factual ATO
 * reference data.
 *
 * Query params:
 *   ?residency=non_resident   — non-resident brackets (default)
 *   ?residency=resident       — resident brackets
 *   ?tax_year=2025-26         — filter to a single financial year
 *
 * Response: { data: TaxBracket[], meta: { total, residency, tax_year, updated_at } }
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

  // Default to the foreign-investor (non-resident) bracket set.
  const residency = parsed.data.residency ?? "non_resident";
  const taxYear = parsed.data.tax_year ?? null;

  try {
    const supabase = createStaticClient();

    let query = supabase
      .from("fi_tax_brackets")
      .select(PUBLIC_SELECT, { count: "exact" })
      .eq("is_active", true)
      .eq("taxpayer_type", residency)
      .order("sort_order", { ascending: true });

    if (taxYear) {
      query = query.eq("tax_year", taxYear);
    }

    const { data: rows, count, error } = await query;

    if (error) {
      log.error("Failed to fetch tax brackets", { error: error.message });
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
        { error: "Failed to fetch tax brackets" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    const data = ((rows || []) as unknown as TaxBracketRow[]).map(shapeRow);

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
          residency,
          tax_year: taxYear,
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
    log.error("Unexpected error in GET /api/v1/tax/brackets", { error: msg });
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

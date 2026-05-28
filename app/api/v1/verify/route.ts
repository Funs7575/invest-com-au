/**
 * GET /api/v1/verify
 *
 * Verification-as-a-Service: returns the invest.com.au verification status
 * for a named advisor or advisory firm. Factual data only — no PII.
 *
 * Use this endpoint to:
 *  - Confirm whether an advisor listed on your platform is invest.com.au
 *    verified before displaying our "Verified by invest.com.au" trust mark.
 *  - Build integrations that surface adviser credentials (AFSL, ABN, status).
 *  - Power due-diligence workflows for B2B customers.
 *
 * Query params:
 *   ?type=advisor  — look up a professional by slug (required)
 *   ?type=firm     — look up an advisory firm by slug (required)
 *   ?slug=xxx      — entity slug (required)
 *
 * Response fields (advisor):
 *   slug, name, type, verified, afsl_number, afsl_status (from ASIC register),
 *   abn, verified_at, verification_method, profile_url
 *
 * Response fields (firm):
 *   slug, name, afsl_number, afsl_status, abn, status, profile_url
 *
 * Requires API key. Available to Basic, Pro, and Enterprise tiers.
 * Free tier does not include this endpoint.
 *
 * Cache-Control: public, max-age=3600 (advisors refresh hourly; trust mark
 * widgets benefit from CDN caching per entity slug).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStaticClient } from "@/lib/supabase/static";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { normaliseAfslNumber } from "@/lib/afsl-register";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-verify");

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const start = Date.now();

  const auth = await validateApiKey(request, "/api/v1/verify");
  if (!auth.valid) {
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/verify",
      method: "GET",
      statusCode: 401,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json({ error: auth.error }, { status: 401, headers: API_CORS_HEADERS });
  }

  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const slug = params.get("slug")?.trim() ?? "";

  if (type !== "advisor" && type !== "firm") {
    return NextResponse.json(
      { error: 'Missing or invalid ?type= parameter. Must be "advisor" or "firm".' },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Missing or invalid ?slug= parameter." },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  try {
    const supabase = createAdminClient();
    const publicSupabase = createStaticClient();

    if (type === "advisor") {
      const { data: pro } = await supabase
        .from("professionals")
        .select(
          "slug, name, type, verified, afsl_number, abn, verified_at, verification_method, status",
        )
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (!pro) {
        logApiRequest({
          apiKeyId: auth.apiKey?.id || null,
          endpoint: "/api/v1/verify",
          method: "GET",
          statusCode: 404,
          responseTimeMs: Date.now() - start,
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        });
        return NextResponse.json(
          { error: "Advisor not found." },
          { status: 404, headers: API_CORS_HEADERS },
        );
      }

      // Look up AFSL status from our register cache (public table, anon client)
      let afslStatus: string | null = null;
      if (pro.afsl_number) {
        const normalised = normaliseAfslNumber(pro.afsl_number);
        const { data: afslRow } = await publicSupabase
          .from("afsl_register")
          .select("status")
          .eq("afsl_number", normalised)
          .maybeSingle();
        afslStatus = afslRow?.status ?? null;
      }

      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/verify",
        method: "GET",
        statusCode: 200,
        responseTimeMs: Date.now() - start,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });

      return NextResponse.json(
        {
          type: "advisor",
          slug: pro.slug,
          name: pro.name,
          professional_type: pro.type,
          verified: pro.verified,
          afsl_number: pro.afsl_number ?? null,
          afsl_status: afslStatus,
          abn: pro.abn ?? null,
          verified_at: pro.verified_at ?? null,
          verification_method: pro.verification_method ?? null,
          profile_url: `https://invest.com.au/advisor/${pro.slug}`,
          trust_mark_embed: `<script src="https://invest.com.au/api/widget/trust-mark?type=advisor&slug=${pro.slug}"></script>`,
        },
        {
          status: 200,
          headers: {
            ...API_CORS_HEADERS,
            "Cache-Control": "public, max-age=3600",
          },
        },
      );
    }

    // type === "firm"
    const { data: firm } = await supabase
      .from("advisor_firms")
      .select("slug, name, afsl_number, abn, status")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (!firm) {
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: "/api/v1/verify",
        method: "GET",
        statusCode: 404,
        responseTimeMs: Date.now() - start,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Firm not found." },
        { status: 404, headers: API_CORS_HEADERS },
      );
    }

    let afslStatus: string | null = null;
    if (firm.afsl_number) {
      const normalised = normaliseAfslNumber(firm.afsl_number);
      const { data: afslRow } = await publicSupabase
        .from("afsl_register")
        .select("status")
        .eq("afsl_number", normalised)
        .maybeSingle();
      afslStatus = afslRow?.status ?? null;
    }

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/verify",
      method: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      {
        type: "firm",
        slug: firm.slug,
        name: firm.name,
        afsl_number: firm.afsl_number ?? null,
        afsl_status: afslStatus,
        abn: firm.abn ?? null,
        status: firm.status,
        profile_url: `https://invest.com.au/firm/${firm.slug}`,
        trust_mark_embed: `<script src="https://invest.com.au/api/widget/trust-mark?type=firm&slug=${firm.slug}"></script>`,
      },
      {
        status: 200,
        headers: {
          ...API_CORS_HEADERS,
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error in GET /api/v1/verify", { error: msg });
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/verify",
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

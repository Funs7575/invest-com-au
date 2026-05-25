import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-robo-advisor-slug");

/**
 * Public fields for a single robo-advisor detail response.
 * Includes review_content and fee_source_url for the detail view.
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
  "fee_source_url",
  "smsf_support",
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

/**
 * Sanitize a fee changelog entry.
 */
function sanitizeChangelogEntry(
  entry: Record<string, unknown>,
): Record<string, unknown> {
  return {
    field_name:
      typeof entry.field_name === "string"
        ? escapeHtml(entry.field_name)
        : entry.field_name,
    old_value:
      typeof entry.old_value === "string"
        ? escapeHtml(entry.old_value)
        : entry.old_value,
    new_value:
      typeof entry.new_value === "string"
        ? escapeHtml(entry.new_value)
        : entry.new_value,
    change_type:
      typeof entry.change_type === "string"
        ? escapeHtml(entry.change_type)
        : entry.change_type,
    changed_at: entry.changed_at,
    source:
      typeof entry.source === "string"
        ? escapeHtml(entry.source)
        : entry.source,
  };
}

/**
 * OPTIONS /api/v1/robo-advisors/[slug] — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/robo-advisors/[slug]
 *
 * Returns a single robo-advisor's full public profile by slug.
 * Includes fee_changelog (last 10 changes) from broker_data_changes.
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
      endpoint: `/api/v1/robo-advisors/${slug}`,
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
      { error: "Invalid robo-advisor slug" },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  try {
    const supabase = await createClient();

    // Fetch the robo-advisor platform
    const { data: platform, error: platformError } = await supabase
      .from("brokers")
      .select(PUBLIC_FIELDS.join(","))
      .eq("slug", slug)
      .eq("status", "active")
      .eq("platform_type", "robo_advisor")
      .single();

    if (platformError || !platform) {
      const elapsed = Date.now() - start;
      logApiRequest({
        apiKeyId: auth.apiKey?.id || null,
        endpoint: `/api/v1/robo-advisors/${slug}`,
        method: "GET",
        statusCode: 404,
        responseTimeMs: elapsed,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Robo-advisor not found" },
        { status: 404, headers: API_CORS_HEADERS },
      );
    }

    // Fetch fee changelog (last 10 changes)
    const { data: changelog } = await supabase
      .from("broker_data_changes")
      .select(
        "field_name, old_value, new_value, change_type, changed_at, source",
      )
      .eq("broker_slug", slug)
      .order("changed_at", { ascending: false })
      .limit(10);

    const sanitized = sanitizePlatform(
      platform as unknown as Record<string, unknown>,
    );
    const sanitizedChangelog = (changelog || []).map((entry) =>
      sanitizeChangelogEntry(entry as Record<string, unknown>),
    );

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: `/api/v1/robo-advisors/${slug}`,
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
          fee_changelog: sanitizedChangelog,
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
    log.error("Unexpected error in GET /api/v1/robo-advisors/[slug]", {
      error: msg,
    });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: `/api/v1/robo-advisors/${slug}`,
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

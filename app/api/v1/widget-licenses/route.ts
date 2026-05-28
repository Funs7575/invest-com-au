/**
 * /api/v1/widget-licenses — white-label widget license management.
 *
 * GET    — list all active widget licenses for the authenticated API key.
 * POST   — create a new license token (returned once, stored as SHA-256 hash).
 * DELETE — deactivate a license (?id=<license-id>).
 *
 * Tier requirement: Pro or Enterprise.
 *
 * How white-label embedding works:
 *   1. Create a license via POST and save the returned `wlt_xxx` token.
 *   2. Include it in your widget embed URL: `?license=wlt_xxx`
 *      e.g. `<script src="https://invest.com.au/api/widget/licensed?license=wlt_xxx"></script>`
 *   3. The licensed widget route validates the token and omits the
 *      "Powered by invest.com.au" attribution footer.
 *   4. Optionally restrict embedding to a list of allowed domains via
 *      `allowed_domains` — leave empty to allow all domains.
 *
 * Token security:
 *   The full token is shown exactly once at creation. It is stored as a
 *   SHA-256 hash; the first 16 characters are kept for identification.
 *   Treat the token like an API key — do not expose it in public source code.
 *
 * Max 10 license tokens per API key.
 *
 * Available to Pro and Enterprise tiers. Basic/Free cannot create widget licenses.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { randomBytes, createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-widget-licenses");

const MAX_LICENSES_PER_KEY = 10;

const DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

const CreateLicenseBody = z.object({
  name: z.string().max(128).default(""),
  allowed_domains: z
    .array(
      z.string()
        .max(253)
        .regex(DOMAIN_RE, "Each domain must be a valid hostname (e.g. example.com)"),
    )
    .max(20)
    .default([]),
});

async function requireAuth(request: NextRequest) {
  const auth = await validateApiKey(request, "/api/v1/widget-licenses");
  if (!auth.valid || !auth.apiKey) {
    return {
      key: null,
      authKey: auth,
      response: NextResponse.json(
        { error: auth.error ?? "Unauthorized" },
        { status: auth.statusCode ?? 401, headers: API_CORS_HEADERS },
      ),
    };
  }
  if (auth.apiKey.tier !== "pro" && auth.apiKey.tier !== "enterprise") {
    return {
      key: null,
      authKey: auth,
      response: NextResponse.json(
        {
          error:
            "Widget license creation requires a Pro or Enterprise API plan. Upgrade at invest.com.au/embed/licensing.",
        },
        { status: 403, headers: API_CORS_HEADERS },
      ),
    };
  }
  return { key: auth.apiKey, authKey: auth, response: null };
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const { key, authKey, response } = await requireAuth(request);
  if (!key) {
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/widget-licenses",
      method: "GET",
      statusCode: response!.status,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return response!;
  }

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("widget_licenses")
    .select("id, name, token_prefix, allowed_domains, is_active, created_at, updated_at")
    .eq("api_key_id", key.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Failed to list widget licenses", { keyId: key.id, error: error.message });
    logApiRequest({
      apiKeyId: authKey.apiKey?.id || null,
      endpoint: "/api/v1/widget-licenses",
      method: "GET",
      statusCode: 500,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      { error: "Failed to list widget licenses" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }

  logApiRequest({
    apiKeyId: key.id,
    endpoint: "/api/v1/widget-licenses",
    method: "GET",
    statusCode: 200,
    responseTimeMs: Date.now() - start,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json(
    { licenses: data ?? [], embed_url_template: "https://invest.com.au/api/widget/licensed?license={token}" },
    { headers: API_CORS_HEADERS },
  );
}

export const POST = withValidatedBody(
  CreateLicenseBody,
  async (request: NextRequest, body) => {
    const start = Date.now();
    const { key, authKey, response } = await requireAuth(request);
    if (!key) {
      logApiRequest({
        apiKeyId: null,
        endpoint: "/api/v1/widget-licenses",
        method: "POST",
        statusCode: response!.status,
        responseTimeMs: Date.now() - start,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return response!;
    }

    const supabase = createAdminClient();

    // Enforce per-key limit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await (supabase as any)
      .from("widget_licenses")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", key.id)
      .eq("is_active", true);

    if (countError) {
      log.error("License count query failed", { keyId: key.id, error: countError.message });
      return NextResponse.json(
        { error: "Failed to check license count" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    if ((count ?? 0) >= MAX_LICENSES_PER_KEY) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LICENSES_PER_KEY} widget licenses per API key.` },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    const plainToken = `wlt_${randomBytes(32).toString("hex")}`;
    const tokenHash = createHash("sha256").update(plainToken).digest("hex");
    const tokenPrefix = plainToken.slice(0, 16); // "wlt_xxxxxxxxxxxx"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertError } = await (supabase as any)
      .from("widget_licenses")
      .insert({
        api_key_id: key.id,
        name: body.name,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        allowed_domains: body.allowed_domains,
        is_active: true,
      })
      .select("id, name, token_prefix, allowed_domains, is_active, created_at")
      .single();

    if (insertError) {
      log.error("License insert failed", { keyId: key.id, error: insertError.message });
      logApiRequest({
        apiKeyId: authKey.apiKey?.id || null,
        endpoint: "/api/v1/widget-licenses",
        method: "POST",
        statusCode: 500,
        responseTimeMs: Date.now() - start,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json(
        { error: "Failed to create widget license" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    log.info("Widget license created", { keyId: key.id, licenseId: inserted.id });

    logApiRequest({
      apiKeyId: key.id,
      endpoint: "/api/v1/widget-licenses",
      method: "POST",
      statusCode: 201,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      {
        license: {
          id: inserted.id,
          name: inserted.name,
          token: plainToken,          // shown exactly once
          token_prefix: inserted.token_prefix,
          allowed_domains: inserted.allowed_domains,
          is_active: inserted.is_active,
          created_at: inserted.created_at,
        },
        embed_url: `https://invest.com.au/api/widget/licensed?license=${plainToken}`,
        message:
          "Save your license token securely — it will not be shown again. Use it as the `license` query parameter on any /api/widget/licensed URL.",
      },
      { status: 201, headers: API_CORS_HEADERS },
    );
  },
);

export async function DELETE(request: NextRequest) {
  const start = Date.now();
  const { key, response } = await requireAuth(request);
  if (!key) return response!;

  const { searchParams } = new URL(request.url);
  const licenseId = searchParams.get("id");

  if (!licenseId) {
    return NextResponse.json(
      { error: "Missing ?id=<license-id> query parameter" },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("widget_licenses")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", licenseId)
    .eq("api_key_id", key.id)
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("License delete failed", { keyId: key.id, licenseId, error: error.message });
    return NextResponse.json(
      { error: "Failed to delete widget license" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "License not found or already deleted" },
      { status: 404, headers: API_CORS_HEADERS },
    );
  }

  log.info("Widget license deactivated", { keyId: key.id, licenseId });

  logApiRequest({
    apiKeyId: key.id,
    endpoint: "/api/v1/widget-licenses",
    method: "DELETE",
    statusCode: 200,
    responseTimeMs: Date.now() - start,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json(
    { message: "License deleted", id: licenseId },
    { headers: API_CORS_HEADERS },
  );
}

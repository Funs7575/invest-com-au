import { NextResponse } from "next/server";
import { API_CORS_HEADERS } from "@/lib/api-auth";
import { buildOpenApiSpec } from "@/lib/openapi-spec";

export const runtime = "nodejs";
// OpenAPI spec is static content — allow CDN caching for 24h.
// No per-key auth state is involved.
export const dynamic = "force-static";

/**
 * OPTIONS /api/v1/openapi.json — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/openapi.json
 *
 * Returns a valid OpenAPI 3.1 document describing every v1 endpoint,
 * their parameters, schemas, and security requirements.
 *
 * No authentication required — this is a public discovery endpoint.
 * The spec is generated from lib/openapi-spec.ts, the single source of truth.
 */
export function GET() {
  const spec = buildOpenApiSpec();

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      ...API_CORS_HEADERS,
      // Publicly cacheable — spec only changes on deploy.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      "Content-Type": "application/json",
    },
  });
}

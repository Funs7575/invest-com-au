/**
 * Classified error responses for Get Matched API routes.
 *
 * The route handlers previously returned an opaque 500 with the generic
 * message "Failed to start Get Matched.", which masked the real cause —
 * usually the migration not being applied to the Supabase project on a
 * fresh Vercel preview. This helper inspects the underlying error and
 * returns a typed `{code, status, detail}` so the client can render an
 * actionable message and operators can grep the logs.
 */

import { NextResponse } from "next/server";

export type GetMatchedErrorCode =
  | "database_not_ready"
  | "supabase_not_configured"
  | "supabase_unreachable"
  | "internal_error";

export interface ClassifiedError {
  code: GetMatchedErrorCode;
  status: number;
  detail: string;
}

/** Inspect a thrown error and classify it into one of the codes above. */
export function classifyGetMatchedError(err: unknown): ClassifiedError {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  // Supabase admin client throws this string when env vars are missing.
  if (
    lower.includes("missing next_public_supabase_url") ||
    lower.includes("missing supabase_service_role_key")
  ) {
    return {
      code: "supabase_not_configured",
      status: 503,
      detail: message,
    };
  }

  // Postgres 42P01 = undefined_table; surfaced by PostgREST as
  // 'relation "..." does not exist'.
  if (
    lower.includes("relation") &&
    lower.includes("does not exist")
  ) {
    return {
      code: "database_not_ready",
      status: 503,
      detail: message,
    };
  }

  // Network / DNS / fetch failures from the admin client.
  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnrefused") ||
    lower.includes("getaddrinfo")
  ) {
    return {
      code: "supabase_unreachable",
      status: 503,
      detail: message,
    };
  }

  return {
    code: "internal_error",
    status: 500,
    detail: message,
  };
}

/** Build a NextResponse.json body that includes the classified code +
 *  detail so the client can render a useful message. The `error` field
 *  stays human-readable for backwards compat with the existing client
 *  fetch handlers; new fields are optional. */
export function errorResponse(
  classified: ClassifiedError,
  fallbackMessage: string,
): NextResponse {
  return NextResponse.json(
    {
      error: humanMessageForCode(classified.code, fallbackMessage),
      code: classified.code,
      detail: classified.detail,
    },
    { status: classified.status },
  );
}

function humanMessageForCode(
  code: GetMatchedErrorCode,
  fallback: string,
): string {
  switch (code) {
    case "database_not_ready":
      return "Get Matched isn't ready yet — the database migration hasn't been applied. Try again in a moment, or apply migration 20260724_gm01_get_matched_router.sql to Supabase.";
    case "supabase_not_configured":
      return "Get Matched can't reach the database — Supabase environment variables aren't set on this deployment.";
    case "supabase_unreachable":
      return "Get Matched can't reach the database right now. Please try again in a moment.";
    case "internal_error":
    default:
      return fallback;
  }
}

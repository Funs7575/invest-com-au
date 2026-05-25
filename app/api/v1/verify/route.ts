import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";
import {
  verifyAfslSubject,
  verifyAbnSubject,
  type VerifyResult,
} from "@/lib/verify-registry";

export const runtime = "nodejs";
// force-dynamic: per-API-key allowed_endpoints + rate limits mean a shared
// CDN cache across keys would bypass access control. The Cache-Control
// header on success uses `private` so each consumer caches their own copy.
export const dynamic = "force-dynamic";

const log = logger("api-v1-verify");

const ENDPOINT = "/api/v1/verify";

/**
 * Query schema. At least one of `afsl` / `abn` must be present — enforced
 * after parse so we can return a precise 400. We don't reject on shape here
 * (the pipeline returns a structured `outcome: "invalid"` for malformed
 * numbers, which is more useful to an API consumer than a bare 400).
 */
const VerifyQuery = z.object({
  afsl: z.string().trim().min(1).max(40).optional(),
  abn: z.string().trim().min(1).max(40).optional(),
});

/** Escape the free-text string fields before returning them to a caller. */
function sanitizeResult(r: VerifyResult): VerifyResult {
  return {
    ...r,
    status: escapeHtml(r.status),
    licensee_name: r.licensee_name ? escapeHtml(r.licensee_name) : null,
    conditions_summary: r.conditions_summary
      ? escapeHtml(r.conditions_summary)
      : null,
    source: escapeHtml(r.source),
    // source_url is built from encodeURIComponent'd digits + a constant base.
  };
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

/**
 * OPTIONS /api/v1/verify — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/verify
 *
 * Verification-as-a-Service. Runs the existing AFSL/ABN register-check
 * pipeline against PUBLIC register data only and returns a structured,
 * factual result. This is not financial advice and makes no recommendation.
 *
 * Query params (at least one required):
 *   ?afsl=<number>   — verify an AFSL number against the public AFS register
 *   ?abn=<number>    — verify an ABN against the official ABR web service
 *
 * Either or both may be supplied. When both are present the response
 * includes both results plus a top-level `verified` that is true only when
 * every requested subject verified.
 *
 * Response:
 *   {
 *     data: {
 *       verified: boolean | null,           // overall (AND of all subjects)
 *       afsl?: VerifyResult,
 *       abn?: VerifyResult,
 *     },
 *     meta: { checked_at, subjects }
 *   }
 *
 * A VerifyResult is:
 *   { subject, verified, outcome, number, status, licensee_name,
 *     conditions_summary, checked_at, source, source_url }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    logApiRequest({
      apiKeyId: null,
      endpoint: ENDPOINT,
      method: "GET",
      statusCode: 401,
      responseTimeMs: Date.now() - start,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    return NextResponse.json(
      { error: auth.error },
      { status: 401, headers: API_CORS_HEADERS },
    );
  }

  const finish = (statusCode: number) =>
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: ENDPOINT,
      method: "GET",
      statusCode,
      responseTimeMs: Date.now() - start,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") || "unknown",
    });

  try {
    const parsed = VerifyQuery.safeParse({
      afsl: request.nextUrl.searchParams.get("afsl") ?? undefined,
      abn: request.nextUrl.searchParams.get("abn") ?? undefined,
    });

    if (!parsed.success) {
      finish(400);
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    const { afsl, abn } = parsed.data;
    if (!afsl && !abn) {
      finish(400);
      return NextResponse.json(
        {
          error:
            "Provide at least one of ?afsl=<number> or ?abn=<number> to verify.",
        },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    // Run both checks in parallel where both are requested.
    const [afslResult, abnResult] = await Promise.all([
      afsl ? verifyAfslSubject(afsl) : Promise.resolve(null),
      abn ? verifyAbnSubject(abn) : Promise.resolve(null),
    ]);

    const subjects: VerifyResult[] = [];
    const data: {
      verified: boolean | null;
      afsl?: VerifyResult;
      abn?: VerifyResult;
    } = { verified: null };

    if (afslResult) {
      const clean = sanitizeResult(afslResult);
      data.afsl = clean;
      subjects.push(clean);
    }
    if (abnResult) {
      const clean = sanitizeResult(abnResult);
      data.abn = clean;
      subjects.push(clean);
    }

    // Overall verdict: true only if every requested subject verified; false
    // if any explicitly failed; null if anything was merely unverifiable and
    // nothing failed.
    if (subjects.some((s) => s.verified === false)) {
      data.verified = false;
    } else if (subjects.every((s) => s.verified === true)) {
      data.verified = true;
    } else {
      data.verified = null;
    }

    finish(200);
    return NextResponse.json(
      {
        data,
        meta: {
          checked_at: new Date().toISOString(),
          subjects: subjects.map((s) => s.subject),
        },
      },
      {
        status: 200,
        headers: {
          ...API_CORS_HEADERS,
          // Register data changes slowly; let each consumer cache 1h privately.
          "Cache-Control": "private, max-age=3600",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error in GET /api/v1/verify", { error: msg });
    finish(500);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }
}

/**
 * Route factory for /api/v1/calculators/* endpoints.
 *
 * Every calculator route is the same scaffold around a different
 * `CalculatorDefinition`:
 *
 *   1. Body validation  — `withValidatedBody` (400 + Zod issues on mismatch)
 *   2. Key auth         — `validateApiKey` (Bearer ica_…; 401 bad/missing,
 *                         403 tier gate, 429 daily quota — all enforced by
 *                         the shared validator against the `api_keys` row)
 *   3. Burst limit      — `isRateLimited` per-key per-minute window using
 *                         the key row's own `rate_limit_per_minute` (429)
 *   4. Compute          — the registry's `run()` (same pure functions the
 *                         on-site calculators use)
 *   5. Metering         — `validateApiKey` already bumps the per-key daily
 *                         counters; `logApiRequest` appends a row to
 *                         `api_request_log` (key, endpoint, status, day).
 *                         Both are fire-and-forget / fail-open: a metering
 *                         failure never fails the API call.
 *
 * Responses (200):
 *   {
 *     calculator, version, inputs (echoed, defaults applied), results,
 *     assumptions, disclaimer (GENERAL_ADVICE_WARNING), meta
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { isRateLimited } from "@/lib/rate-limit";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { logger } from "@/lib/logger";
import {
  CALCULATORS_API_VERSION,
  type CalculatorDefinition,
} from "@/lib/calculators/api-registry";

/** Fallback per-minute burst limit when the key row carries none. */
const DEFAULT_PER_MINUTE_LIMIT = 30;

interface CalculatorRouteHandlers {
  POST: (req: NextRequest) => Promise<NextResponse>;
  OPTIONS: () => NextResponse;
}

function clientMeta(request: NextRequest): { ipAddress: string; userAgent: string } {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

export function buildCalculatorRoute<S extends z.ZodType>(
  def: CalculatorDefinition<S>,
): CalculatorRouteHandlers {
  const endpoint = `/api/v1/calculators/${def.slug}`;
  const log = logger(`api-v1-calculators-${def.slug}`);

  /**
   * Fire-and-forget request metering. `logApiRequest` swallows its own
   * errors; the extra `.catch` guards against the promise itself
   * rejecting so metering can never fail the API call.
   */
  function meter(request: NextRequest, apiKeyId: string | null, statusCode: number, start: number): void {
    try {
      void Promise.resolve(
        logApiRequest({
          apiKeyId,
          endpoint,
          method: "POST",
          statusCode,
          responseTimeMs: Date.now() - start,
          ...clientMeta(request),
        }),
      ).catch((err: unknown) => {
        log.error("Metering failed (fail-open)", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      log.error("Metering threw (fail-open)", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const POST = withValidatedBody(def.inputSchema, async (request, body) => {
    const start = Date.now();

    // ── Auth (401 bad/missing key, 403 tier, 429 daily quota) ──
    const auth = await validateApiKey(request, endpoint);
    if (!auth.valid || !auth.apiKey) {
      const status = auth.statusCode ?? 401;
      meter(request, null, status, start);
      return NextResponse.json(
        { error: auth.error ?? "Unauthorized" },
        { status, headers: API_CORS_HEADERS },
      );
    }

    // ── Per-minute burst window (shared bucket across calculator routes) ──
    const perMinute = auth.apiKey.rate_limit_per_minute || DEFAULT_PER_MINUTE_LIMIT;
    if (await isRateLimited(`v1-calculators:${auth.apiKey.id}`, perMinute, 1)) {
      meter(request, auth.apiKey.id, 429, start);
      return NextResponse.json(
        {
          error: `Rate limit exceeded (${perMinute} requests/minute). Retry shortly.`,
        },
        { status: 429, headers: API_CORS_HEADERS },
      );
    }

    // ── Compute via the site's own calculator function ──
    try {
      const results = def.run(body);
      meter(request, auth.apiKey.id, 200, start);
      return NextResponse.json(
        {
          calculator: def.slug,
          version: CALCULATORS_API_VERSION,
          inputs: body,
          results,
          assumptions: def.assumptions,
          disclaimer: GENERAL_ADVICE_WARNING,
          meta: { generated_at: new Date().toISOString() },
        },
        {
          status: 200,
          headers: { ...API_CORS_HEADERS, "Cache-Control": "no-store" },
        },
      );
    } catch (err) {
      log.error("Calculator computation failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      meter(request, auth.apiKey.id, 500, start);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }
  });

  function OPTIONS(): NextResponse {
    return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
  }

  return { POST, OPTIONS };
}

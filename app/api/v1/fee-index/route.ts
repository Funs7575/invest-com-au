import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { readFeeIndex, computeTrend } from "@/lib/fee-index";

export const runtime = "nodejs";
// Per-key auth gating — see /api/v1/brokers/route.ts for the same reasoning.
export const dynamic = "force-dynamic";

const log = logger("api-v1-fee-index");

/**
 * OPTIONS /api/v1/fee-index — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/fee-index
 *
 * Returns the AU brokerage fee index: market-wide average and median ASX
 * per-trade fee, US share fee, and FX spread, with QoQ and YoY trend deltas.
 *
 * The underlying data is computed daily by the fee-index cron job from
 * `broker_price_snapshots`, stored in `fee_index_snapshots`, and read back
 * here. It is FACTUAL aggregate data — not financial advice.
 *
 * Query params:
 *   ?history=90   — number of prior daily snapshots to include in
 *                   the `history` array (default 90, max 400).
 *                   Pass 0 to return latest-only with no history.
 *
 * Response:
 *   {
 *     data: {
 *       latest: FeeIndexSnapshot | null,
 *       trend: FeeIndexTrend | null,
 *       history: FeeIndexSnapshot[]   // DESC by period
 *     },
 *     meta: { updated_at, history_days }
 *   }
 */
export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth ──
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/fee-index",
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

    // history param: number of daily rows to return (0–400)
    let historyDays = parseInt(params.get("history") || "90", 10);
    if (!Number.isFinite(historyDays) || historyDays < 0) historyDays = 90;
    if (historyDays > 400) historyDays = 400;

    // readFeeIndex uses the admin client — fee_index_snapshots has no
    // anon RLS policy (service-role only, per lib/fee-index.ts comment).
    const { latest, history } = await readFeeIndex(
      // fetch enough history for trend calc (need ≥ 365 rows to get YoY)
      // but respect the caller's requested limit for the response body.
      Math.max(historyDays, 400),
    );

    const trend = latest ? computeTrend(latest, history) : null;

    // Trim the history array to what the caller asked for
    const trimmedHistory = historyDays === 0 ? [] : history.slice(0, historyDays);

    const elapsed = Date.now() - start;

    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/fee-index",
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
          latest,
          trend,
          history: trimmedHistory,
        },
        meta: {
          updated_at: latest?.computed_at ?? null,
          history_days: trimmedHistory.length,
        },
      },
      {
        status: 200,
        headers: {
          ...API_CORS_HEADERS,
          // Fee-index is updated once daily by cron; 1-hour private cache is fine.
          "Cache-Control": "private, max-age=3600",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error in GET /api/v1/fee-index", { error: msg });
    const elapsed = Date.now() - start;
    logApiRequest({
      apiKeyId: auth.apiKey?.id || null,
      endpoint: "/api/v1/fee-index",
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

import { NextRequest, NextResponse } from "next/server";
import { logSearchQuery, isValidSurface } from "@/lib/search-analytics";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export const runtime = "nodejs";

/**
 * POST /api/analytics/search-log
 *
 * Anonymous capture endpoint for site search queries. Never
 * returns anything sensitive — just a 200 on success or a
 * 4xx/429 on validation / throttling. The lib does the PII
 * redaction before writing.
 *
 * Body: { query, surface, result_count?, result_clicked?,
 *         clicked_rank?, session_id? }
 *
 * Rate limited generously (120/min) because a single user
 * might type 10 queries in quick succession while experimenting
 * with filters.
 */
export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("search_log", ipKey(request), {
      max: 120,
      refillPerSec: 2,
    }))
  ) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query : null;
  const surface = body.surface;
  if (!query || !isValidSurface(surface)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const ok = await logSearchQuery({
    queryText: query,
    surface,
    resultCount: typeof body.result_count === "number" ? body.result_count : null,
    resultClicked: body.result_clicked === true,
    clickedRank:
      typeof body.clicked_rank === "number" ? body.clicked_rank : null,
    sessionId: typeof body.session_id === "string" ? body.session_id : null,
  });

  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  return NextResponse.json({ ok: true });
}

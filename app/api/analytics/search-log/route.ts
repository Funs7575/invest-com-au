import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logSearchQuery } from "@/lib/search-analytics";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export const runtime = "nodejs";

const SearchLogBody = z.object({
  query: z.string().min(1),
  surface: z.enum(["articles", "advisors", "compare", "best_for", "topic", "tag", "quiz", "global"]),
  result_count: z.number().nullish(),
  result_clicked: z.boolean().optional(),
  clicked_rank: z.number().nullish(),
  session_id: z.string().nullish(),
});

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

  const parsed = SearchLogBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { query, surface, result_count, result_clicked, clicked_rank, session_id } = parsed.data;

  const ok = await logSearchQuery({
    queryText: query,
    surface,
    resultCount: result_count ?? null,
    resultClicked: result_clicked ?? false,
    clickedRank: clicked_rank ?? null,
    sessionId: session_id ?? null,
  });

  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  return NextResponse.json({ ok: true });
}

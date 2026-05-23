/**
 * GET /api/afsl-search?q=<term>
 *
 * Public fuzzy search over the cached AFSL register. Backs the `/afsl-lookup`
 * tool: type a firm name or partial AFSL number, get matched licensees with
 * status + condition summaries and a link to a matching advisor profile.
 *
 * - Zod-validates `q` (treats invalid/oversized input as "no query" → empty
 *   results, rather than 400-ing a casual typer — see `safeParse` below).
 * - Rate-limited via the shared DB token bucket (`isAllowed`/`ipKey`) to keep
 *   register scraping uneconomic while staying generous for real lookups.
 * - Reads the public-RLS `afsl_register` (and `professionals` for the
 *   cross-link) through the anon-key static client inside `searchAfslRegister`.
 *
 * Cache: short edge TTL. The same `q` returns the same rows for everyone and
 * the underlying table refreshes at most weekly, so a CDN cache absorbs repeat
 * typing without serving badly stale data. Rate-limit still runs on misses.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { searchAfslRegister, AFSL_SEARCH_MIN_QUERY } from "@/lib/afsl-search";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const revalidate = 3600;

const log = logger("afsl-search");

const QuerySchema = z.object({
  q: z.string().trim().min(AFSL_SEARCH_MIN_QUERY).max(120),
});

export async function GET(req: Request) {
  // 30 searches / min / IP. Tighter than the single-record resolver (60/min)
  // because each search is a wider, more expensive query.
  const allowed = await isAllowed("afsl_search", ipKey({ headers: req.headers }), {
    max: 30,
    refillPerSec: 0.5,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded.", results: [] },
      { status: 429 },
    );
  }

  const url = new URL(req.url);
  // Permissive parse: a too-short / oversized query is a no-op (empty results),
  // not a hard 400 — the lookup field fires this on every keystroke.
  const parsed = QuerySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ results: [], query: "" });
  }

  try {
    const results = await searchAfslRegister(parsed.data.q);
    return NextResponse.json(
      { results, query: parsed.data.q },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    log.error("afsl-search failed", err);
    return NextResponse.json(
      { error: "Search failed.", results: [] },
      { status: 500 },
    );
  }
}

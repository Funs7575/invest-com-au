/**
 * GET /api/ghost-tickers/search?q=<term>
 *
 * Search the file-backed ASX removed-companies extract by former code or
 * company name. Same contract as /api/adviser-register/search: zod
 * safeParse (graceful empties, no 400s for typers), shared DB token
 * bucket with fail-open on limiter backend errors, CDN-cacheable.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { searchGhostTickers, GHOST_SEARCH_MIN_QUERY } from "@/lib/ghost-tickers";

export const runtime = "nodejs";

const log = logger("api:ghost-tickers-search");

const QuerySchema = z.string().trim().min(GHOST_SEARCH_MIN_QUERY).max(80);

export async function GET(request: NextRequest) {
  let allowed = true;
  try {
    allowed = await isAllowed("ghost_tickers_search", ipKey(request), { max: 30, refillPerSec: 0.5 });
  } catch (err) {
    log.warn("rate limiter unavailable — failing open", { err: err instanceof Error ? err.message : String(err) });
  }
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = QuerySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const results = searchGhostTickers(parsed.data).map((t) => ({
    slug: t.slug,
    code: t.code,
    name: t.name,
    event: t.event,
    eventDate: t.eventDate,
  }));

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}

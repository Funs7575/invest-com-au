/**
 * GET /api/postcode-atlas/search?q=<term>
 *
 * Search the file-backed ATO postcode statistics by postcode or suburb.
 * Same contract as the other registry search endpoints: zod safeParse
 * (graceful empties), shared DB token bucket failing open on backend
 * errors, CDN-cacheable.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { searchPostcodes, POSTCODE_SEARCH_MIN_QUERY } from "@/lib/postcode-atlas";

export const runtime = "nodejs";

const log = logger("api:postcode-atlas-search");

const QuerySchema = z.string().trim().min(POSTCODE_SEARCH_MIN_QUERY).max(60);

export async function GET(request: NextRequest) {
  let allowed = true;
  try {
    allowed = await isAllowed("postcode_atlas_search", ipKey(request), { max: 30, refillPerSec: 0.5 });
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

  const results = searchPostcodes(parsed.data).map((p) => ({
    postcode: p.postcode,
    state: p.state,
    suburbs: p.suburbs.slice(0, 3),
    ...(p.medianTaxableIncome !== undefined ? { medianTaxableIncome: p.medianTaxableIncome } : {}),
  }));

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}

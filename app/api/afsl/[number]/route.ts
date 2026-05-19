/**
 * GET /api/afsl/[number]
 *
 * Public resolver for the cached AFSL register. Returns the licensee
 * details if the number is on file, otherwise 404 with a stable shape
 * (so client-side fetchers can branch on `error`).
 *
 * Cache: s-maxage=86400 (24h) at the edge. The underlying table refreshes
 * at most weekly post-launch, so a daily edge TTL keeps clients fast
 * without serving badly stale data. ISR isn't applicable to API routes —
 * we lean on edge cache + the table's `last_verified_at` for freshness.
 */

import { NextResponse } from "next/server";
import { getAfslLicensee, normaliseAfslNumber } from "@/lib/afsl-register";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export const runtime = "nodejs";
// 1h ISR cache. Data is the public AFSL register — same response for all
// callers, safe to CDN-cache. Previously `dynamic = "force-dynamic"`
// silently nullified the `s-maxage=86400` header set at the bottom of
// the file. Rate-limit still applies on cache misses (function invocations);
// the cache absorbs the bulk of repeat lookups.
export const revalidate = 3600;

type Params = { params: Promise<{ number: string }> };

export async function GET(req: Request, { params }: Params) {
  // 60 lookups / min / IP — generous for legit one-off lookups, tight
  // enough to make register scraping uneconomic. Cache-hit responses
  // also help: most repeat traffic comes off the edge cache below.
  const allowed = await isAllowed("afsl_lookup", ipKey({ headers: req.headers }), {
    max: 60,
    refillPerSec: 1,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 },
    );
  }

  const { number } = await params;
  const normalised = normaliseAfslNumber(number);

  if (!normalised) {
    return NextResponse.json(
      { error: "Invalid AFSL number." },
      { status: 400 },
    );
  }

  const licensee = await getAfslLicensee(normalised);
  if (!licensee) {
    return NextResponse.json(
      { error: "AFSL number not found in register cache." },
      { status: 404 },
    );
  }

  return NextResponse.json(licensee, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
}

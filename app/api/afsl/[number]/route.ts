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
export const dynamic = "force-dynamic";

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

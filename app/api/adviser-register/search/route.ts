/**
 * GET /api/adviser-register/search?q=<term>
 *
 * Search the file-backed Financial Advisers Register extract (see
 * lib/adviser-register.ts) by adviser name, number, or licensee. No DB —
 * a single in-memory pass over the bundled extract.
 *
 * - `q` is safeParse'd: invalid/short/oversized input returns empty
 *   results rather than 400-ing a casual typer.
 * - Rate-limited with the shared DB token bucket so the register can't
 *   be scraped through us faster than ASIC's own open-data download.
 * - Cacheable: same q → same rows for everyone until the next ingest.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  searchRegister,
  REGISTER_SEARCH_MIN_QUERY,
} from "@/lib/adviser-register";

export const runtime = "nodejs";

const log = logger("api:adviser-register-search");

const QuerySchema = z.string().trim().min(REGISTER_SEARCH_MIN_QUERY).max(80);

export async function GET(request: NextRequest) {
  // Fail-open on limiter backend errors: this endpoint is read-only over a
  // public bundled dataset, so degraded rate limiting beats a hard 500.
  let allowed = true;
  try {
    allowed = await isAllowed("adviser_register_search", ipKey(request), { max: 30, refillPerSec: 0.5 });
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

  const results = searchRegister(parsed.data).map(({ adviser }) => ({
    slug: adviser.slug,
    name: adviser.name,
    number: adviser.number,
    role: adviser.role,
    licenseeName: adviser.licenseeName,
  }));

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}

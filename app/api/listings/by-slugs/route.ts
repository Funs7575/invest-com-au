/**
 * GET /api/listings/by-slugs?slugs=foo,bar,baz
 *
 * Returns up to 4 active investment_listings rows by slug, in the
 * order they appear in the `slugs` param. Used by /invest/compare's
 * client component when the URL has no `?ids` and the listings have
 * to be hydrated from the shortlist (localStorage) post-mount.
 *
 * Public — no auth — only returns rows with status='active' (same
 * filter the marketplace page applies). Rate-limited by IP since
 * unauthenticated browsing.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:listings:by-slugs");
const MAX_SLUGS = 4;

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAllowed("listings_by_slugs", ipKey(request), { max: 120, refillPerSec: 60 / 60 }))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("slugs") ?? "";
  const slugs = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_SLUGS);
  if (slugs.length === 0) {
    return NextResponse.json({ listings: [] });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_listings")
      .select("*")
      .in("slug", slugs)
      .eq("status", "active");
    if (error) {
      log.warn("by-slugs fetch failed", { error: error.message });
      return NextResponse.json({ listings: [] }, { status: 200 });
    }
    return NextResponse.json({ listings: data ?? [] });
  } catch (err) {
    log.error("by-slugs threw", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ listings: [] }, { status: 200 });
  }
}

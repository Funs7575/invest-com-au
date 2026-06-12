/**
 * GET /api/get-matched/supply — Showcase G5 "live narrowing" supply counts.
 *
 * Returns factual, head-only counts of active supply across the three lanes
 * the Get Matched engine draws on, optionally narrowed by the user's stated
 * answers so far:
 *
 *   { platforms: number, advisors: number, listings: number }
 *
 * Query params (both optional, validated permissively — invalid → ignored,
 * never 400, because the widget must keep working as the user answers):
 *   - `vertical`     one of the engine `Vertical` slugs
 *   - `advisor_type` one of the quiz advisor need-slugs (mapped via
 *                    `dbTypeForNeed` to a `professionals.type`)
 *
 * Counts are FACTUAL supply only — number of active platforms / verified
 * advisors / live listings. No advice framing, no endorsement.
 *
 * Caching: counts can be a few minutes stale. We set `s-maxage` via the
 * response headers AND export `revalidate` so the route is cheap under load.
 *
 * Client choice (per CLAUDE.md):
 *   - `brokers` is public anon-readable → `createClient()` (server).
 *   - `investment_listings` active rows are public anon-readable → server.
 *   - `professionals` full-profile reads have no anon SELECT policy and this
 *     serves the anonymous /get-matched path — the documented admin-client
 *     exception, exactly as `lib/getmatched/advisor-top-match.ts` does. Here
 *     we only HEAD-count and never select profile columns, so no PII leaves
 *     the server.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
// Documented service-role exception: serves the anonymous /get-matched path;
// `professionals` has no anon SELECT policy (same category as
// lib/getmatched/advisor-top-match.ts — see CLAUDE.md "Two Supabase clients").
// We HEAD-count only — no profile columns are read.
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { dbTypeForNeed } from "@/lib/quiz-advisor-types";
import { logger } from "@/lib/logger";

const log = logger("get-matched:supply");

/** Counts can be a few minutes stale — cheap under load. */
export const revalidate = 300;

const VERTICALS = [
  "shares",
  "property",
  "super",
  "crypto",
  "trade",
  "robo",
  "lender",
  "alt",
  "royalties",
  "pre_ipo",
  "opportunity",
] as const;

/** Engine `Vertical` → `investment_listings.vertical` DB value. The listings
 *  table uses its own vocabulary; only the verticals that have listing supply
 *  are mapped. Unmapped verticals fall back to the unfiltered active count. */
const LISTING_VERTICAL_MAP: Partial<Record<(typeof VERTICALS)[number], string>> = {
  property: "property",
  alt: "alt_assets",
  royalties: "royalties",
  pre_ipo: "pre_ipo",
  opportunity: "business",
};

/** Permissive query schema — invalid values are dropped, not rejected. */
const QuerySchema = z.object({
  vertical: z.enum(VERTICALS).optional(),
  advisor_type: z.string().optional(),
});

async function countPlatforms(): Promise<number> {
  // `brokers` active reads are anon-readable → server client, no service role.
  // There is no clean per-vertical column on `brokers` (platform_type is a
  // coarse product-kind, not the engine's `Vertical`), so we return the
  // unfiltered active platform count and let the vertical be a label-only
  // refinement on the client — exactly as the route contract allows.
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("brokers")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}

async function countAdvisors(advisorType: string | undefined): Promise<number> {
  const admin = createAdminClient();
  let query = admin
    .from("professionals")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .eq("verified", true);
  const dbType = advisorType ? dbTypeForNeed(advisorType) : "";
  if (dbType) query = query.eq("type", dbType);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function countListings(
  vertical: (typeof VERTICALS)[number] | undefined,
): Promise<number> {
  // Active listings are anon-readable → server client.
  const supabase = await createClient();
  let query = supabase
    .from("investment_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  const dbVertical = vertical ? LISTING_VERTICAL_MAP[vertical] : undefined;
  if (dbVertical) query = query.eq("vertical", dbVertical);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function GET(request: NextRequest) {
  if (
    !(await isAllowed("gm_supply", ipKey(request), { max: 60, refillPerSec: 1 }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  // Permissive read: invalid values are treated as absent, never 400.
  const parsed = QuerySchema.safeParse({
    vertical: searchParams.get("vertical") ?? undefined,
    advisor_type: searchParams.get("advisor_type") ?? undefined,
  });
  const vertical = parsed.success ? parsed.data.vertical : undefined;
  const advisorType = parsed.success ? parsed.data.advisor_type : undefined;

  try {
    const [platforms, advisors, listings] = await Promise.all([
      countPlatforms(),
      countAdvisors(advisorType),
      countListings(vertical),
    ]);
    return NextResponse.json(
      { platforms, advisors, listings },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    // Fail-soft: the widget hides itself on a non-200, so a degraded count
    // never blocks the funnel. Log for operator visibility.
    log.warn("supply count failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Supply unavailable." }, { status: 503 });
  }
}

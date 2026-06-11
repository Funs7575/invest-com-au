import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("social-proof");

/**
 * Honest social-proof counts.
 *
 * Replaces the fabricated sine-curve counter killed in #1489 (ACL s18).
 * Every number returned here is a real distinct-session count from
 * `analytics_events` over the trailing 7 days, and the endpoint refuses to
 * show anything below MIN_SHOW_COUNT — the component renders nothing rather
 * than inventing a floor. Pre-launch mirror traffic sits far below the
 * threshold, so this stays hidden until real launch volume exists.
 *
 * Service-role read is required: `analytics_events` has no anon SELECT
 * policy (writes go through /api/track-event), and this is a cross-user
 * aggregate on an anonymous path — squarely inside the allowed service-role
 * scope from the C-stream audit.
 */

const MIN_SHOW_COUNT = 25;
const PERIOD_DAYS = 7;
// Dedupe cap — one page of session ids; with the 1h cache a precise count
// above this adds nothing the UI would show differently.
const SAMPLE_LIMIT = 5000;

const SURFACES = {
  // Sessions that touched the comparison tables.
  compare: { pageLike: "/compare%", eventTypes: null },
  // Sessions that actually ran a calculator (explicit event, any page).
  calculator: { pageLike: null, eventTypes: ["calculator_use"] },
  // Sessions that started or finished the get-matched funnel.
  quiz: { pageLike: null, eventTypes: ["quiz_start", "quiz_complete"] },
  // Sessions on the live rate board.
  rates: { pageLike: "/rates%", eventTypes: null },
} as const;

export type SocialProofSurface = keyof typeof SURFACES;

function isSurface(value: string): value is SocialProofSurface {
  return value in SURFACES;
}

async function countDistinctSessions(surface: SocialProofSurface): Promise<number | null> {
  const config = SURFACES[surface];
  const since = new Date(Date.now() - PERIOD_DAYS * 86_400_000).toISOString();
  const supabase = createAdminClient();

  let query = supabase
    .from("analytics_events")
    .select("session_id")
    .gte("created_at", since)
    .not("session_id", "is", null)
    .limit(SAMPLE_LIMIT);
  if (config.pageLike) query = query.like("page", config.pageLike);
  if (config.eventTypes) query = query.in("event_type", [...config.eventTypes]);

  const { data, error } = await query;
  if (error) {
    log.error("social-proof count failed", { surface, error: error.message });
    return null;
  }
  return new Set((data ?? []).map((row) => row.session_id)).size;
}

const getCachedCount = unstable_cache(
  async (surface: SocialProofSurface) => countDistinctSessions(surface),
  ["social-proof-count"],
  { revalidate: 3600 },
);

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("surface") ?? "compare";
  if (!isSurface(raw)) {
    return NextResponse.json({ error: "unknown surface" }, { status: 400 });
  }

  const count = await getCachedCount(raw);
  const show = count !== null && count >= MIN_SHOW_COUNT;

  return NextResponse.json(
    // Below threshold the count is withheld entirely — a small real number
    // is honest but reads as anti-proof, and a fabricated floor is the exact
    // failure mode this endpoint exists to prevent.
    { show, count: show ? count : null, periodDays: PERIOD_DAYS },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

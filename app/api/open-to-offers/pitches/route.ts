import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isFlagEnabled } from "@/lib/feature-flags";
import { listPitchesForUser, effectiveStatus } from "@/lib/prospect-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/open-to-offers/pitches
 *
 * The consumer's pending pitch inbox: each pending pitch joined to the pitching
 * adviser's PUBLIC profile summary. 404 when the feature flag is off.
 *
 * Auth: the user reads THEIR OWN pitches — the helper looks up their
 * prospect_pool row (keyed by auth user id) and joins pitches server-side
 * (advisor_pitches is service-role-only, so there's no direct RLS read path).
 */
export async function GET(request: NextRequest) {
  if (!(await isAllowed("oto_inbox", ipKey(request), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!(await isFlagEnabled("open_to_offers", { segment: "user" }))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { prospect, pitches } = await listPitchesForUser(user.id);

  return NextResponse.json({
    optInStatus: prospect ? effectiveStatus(prospect) : "off",
    expiresAt: prospect?.expires_at ?? null,
    pitches: pitches.map(({ pitch, adviser }) => ({
      id: pitch.id,
      body: pitch.body,
      feeBand: pitch.fee_band,
      createdAt: pitch.created_at,
      adviser,
    })),
  });
}

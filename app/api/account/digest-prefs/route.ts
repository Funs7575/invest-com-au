import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getInvestorProfile, upsertInvestorProfile } from "@/lib/investor-profiles";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:account:digest-prefs");

export type DigestPrefs = {
  watchlist_digest: boolean;
  advisor_digest: boolean;
};

const Body = z.object({
  watchlist_digest: z.boolean().optional(),
  advisor_digest: z.boolean().optional(),
});

/**
 * GET /api/account/digest-prefs
 *
 * Returns the authenticated user's digest email preferences, read from
 * investor_profiles.meta. Defaults to false for any unset key.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getInvestorProfile(user.id);
  const meta = profile?.meta ?? {};

  const prefs: DigestPrefs = {
    watchlist_digest: meta.watchlist_digest === true,
    advisor_digest: meta.advisor_digest === true,
  };

  return NextResponse.json({ prefs });
}

/**
 * PUT /api/account/digest-prefs
 *
 * Merges supplied digest preference keys into investor_profiles.meta.
 * Only keys present in the body are updated — existing keys are preserved.
 */
export const PUT = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getInvestorProfile(user.id);
  const currentMeta = profile?.meta ?? {};

  const mergedMeta: Record<string, unknown> = { ...currentMeta };
  if (body.watchlist_digest !== undefined) mergedMeta.watchlist_digest = body.watchlist_digest;
  if (body.advisor_digest !== undefined) mergedMeta.advisor_digest = body.advisor_digest;

  const ok = await upsertInvestorProfile(user.id, { meta: mergedMeta });
  if (!ok) {
    log.warn("digest-prefs PUT failed", { userId: user.id });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const prefs: DigestPrefs = {
    watchlist_digest: mergedMeta.watchlist_digest === true,
    advisor_digest: mergedMeta.advisor_digest === true,
  };

  return NextResponse.json({ prefs });
});

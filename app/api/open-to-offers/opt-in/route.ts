import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isFlagEnabled } from "@/lib/feature-flags";
import { getInvestorProfile } from "@/lib/investor-profiles";
import { getLatestForUser } from "@/lib/quiz-history";
import { buildSnapshot, scrubSnapshot, SnapshotPiiError } from "@/lib/prospect-pool/snapshot";
import {
  activateProspect,
  setProspectStatus,
  getProspectForUser,
  effectiveStatus,
} from "@/lib/prospect-pool";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api:open-to-offers:opt-in");

const Body = z.object({
  action: z.enum(["activate", "pause", "withdraw"]),
});

/**
 * Resolve the consumer's STATE from a non-PII source (user_profiles.state).
 * State is the only location granularity that may enter the snapshot.
 */
async function resolveState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("state")
    .eq("id", userId)
    .maybeSingle();
  return (data?.state as string | null) ?? null;
}

/**
 * GET — the consumer's current opt-in status for the dashboard block.
 * 404 when the feature flag is off (dormant).
 */
export async function GET(request: NextRequest) {
  if (!(await isAllowed("oto_status", ipKey(request), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!(await isFlagEnabled("open_to_offers", { segment: "user" }))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const row = await getProspectForUser(user.id);
  if (!row) {
    return NextResponse.json({ status: "off", expiresAt: null });
  }
  return NextResponse.json({
    status: effectiveStatus(row),
    expiresAt: row.expires_at,
    snapshot: row.snapshot,
  });
}

/**
 * POST — activate / pause / withdraw the consumer's opt-in.
 *
 *   activate → (re)build an ANONYMISED snapshot server-side from the investor
 *              profile + latest quiz history, scrub it (PII assertion), and
 *              upsert an active prospect_pool row with a 60-day expiry.
 *   pause    → keep the row, stop receiving pitches.
 *   withdraw → mark the row expired (inactive).
 *
 * 404 when the flag is off; 422 if the snapshot scrubber ever finds PII
 * (fail-loud rather than leak).
 */
export const POST = withValidatedBody(Body, async (_req, body) => {
  if (!(await isFlagEnabled("open_to_offers", { segment: "user" }))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (body.action === "pause") {
    const ok = await setProspectStatus(user.id, "paused");
    return ok
      ? NextResponse.json({ status: "paused" })
      : NextResponse.json({ error: "Could not pause." }, { status: 500 });
  }
  if (body.action === "withdraw") {
    const ok = await setProspectStatus(user.id, "expired");
    return ok
      ? NextResponse.json({ status: "off" })
      : NextResponse.json({ error: "Could not withdraw." }, { status: 500 });
  }

  // activate
  const [profile, latestQuiz, stateHint] = await Promise.all([
    getInvestorProfile(user.id),
    getLatestForUser(user.id),
    resolveState(supabase, user.id),
  ]);

  let snapshot;
  try {
    snapshot = scrubSnapshot(buildSnapshot({ profile, latestQuiz, stateHint }));
  } catch (err) {
    if (err instanceof SnapshotPiiError) {
      log.error("opt-in snapshot scrub rejected (PII)", { key: err.key });
      return NextResponse.json(
        { error: "Could not build an anonymised snapshot." },
        { status: 422 },
      );
    }
    throw err;
  }

  const row = await activateProspect(user.id, snapshot);
  if (!row) {
    return NextResponse.json({ error: "Could not opt in." }, { status: 500 });
  }
  return NextResponse.json({
    status: "active",
    expiresAt: row.expires_at,
    snapshot: row.snapshot,
  });
});

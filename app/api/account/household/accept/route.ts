/**
 * /api/account/household/accept — claim a pending household invitation (idea #6).
 *
 * POST { token } → the signed-in acceptor (whose email must match the invited
 * address) claims membership. This is the one cross-user write; the heavy
 * lifting (and the admin-client justification) lives in `lib/households.ts`
 * `claimInvite`. Flag-gated (fail-closed → 404).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isFlagEnabled } from "@/lib/feature-flags";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { HOUSEHOLDS_FLAG, claimInvite, partnerLabel } from "@/lib/households";
import { sendHouseholdAcceptedNotice } from "@/lib/household-emails";
import { getInvestorProfile } from "@/lib/investor-profiles";

const log = logger("api:account:household:accept");

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(1).max(256),
});

export const POST = withValidatedBody(Body, async (req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const flagOn = await isFlagEnabled(HOUSEHOLDS_FLAG, {
    userKey: user.email ?? null,
    segment: "user",
  });
  if (!flagOn) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Tight limit — token guessing protection on top of the unguessable token.
  if (await isRateLimited(`household-accept:${ip}`, 10, 60)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  if (!user.email) {
    return NextResponse.json({ error: "no_email" }, { status: 400 });
  }

  const result = await claimInvite({
    token: body.token,
    userId: user.id,
    acceptorEmail: user.email,
  });

  if (!result.ok) {
    const status =
      result.error === "wrong_email"
        ? 403
        : result.error === "already_in_household"
          ? 409
          : result.error === "db_error"
            ? 500
            : 404; // not_found / not_pending
    return NextResponse.json({ error: result.error }, { status });
  }

  // Notify the owner their partner joined (best-effort). Resolve a friendly
  // label for the acceptor + the owner's email via the membership roster.
  void (async () => {
    try {
      let acceptorName: string | null = null;
      try {
        const profile = await getInvestorProfile(user.id);
        acceptorName = profile?.displayName ?? null;
      } catch {
        acceptorName = null;
      }
      const label = partnerLabel({ displayName: acceptorName, email: user.email });
      // The owner is the household creator; find their invited_email from the
      // roster via the admin-backed context helper would re-read; cheaper to
      // read the owner row directly through the user client (the acceptor is an
      // accepted member now, so the roster SELECT policy lets them see it).
      const { data: ownerRow } = await supabase
        .from("household_members")
        .select("invited_email")
        .eq("household_id", result.household.id)
        .eq("role", "owner")
        .maybeSingle();
      const ownerEmail = (ownerRow as { invited_email?: string } | null)?.invited_email;
      if (ownerEmail) {
        await sendHouseholdAcceptedNotice({
          inviterEmail: ownerEmail,
          partnerLabel: label,
          householdName: result.household.name,
        });
      }
    } catch (err) {
      log.warn("household accepted notice failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  })();

  return NextResponse.json({
    ok: true,
    household: { id: result.household.id, name: result.household.name },
  });
});

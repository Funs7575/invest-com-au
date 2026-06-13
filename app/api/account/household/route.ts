/**
 * /api/account/household — household create / read / delete (idea #6).
 *
 *   GET    — the caller's household context (or { household: null })
 *   POST   — create a household + invite a partner by email
 *   DELETE — owner deletes the whole household
 *
 * All paths are gated behind the `households` feature flag (fail-closed → 404).
 * RLS enforces the data boundaries; these handlers add the app-level cap (one
 * household per user), the partner invite email, and clean error envelopes.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isFlagEnabled } from "@/lib/feature-flags";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import {
  HOUSEHOLDS_FLAG,
  HOUSEHOLD_NAME_MAX,
  createHouseholdWithInvite,
  getHouseholdContextForUser,
  deleteHousehold,
} from "@/lib/households";
import { sendHouseholdInvite } from "@/lib/household-emails";
import { getInvestorProfile } from "@/lib/investor-profiles";

const log = logger("api:account:household");

export const runtime = "nodejs";

async function flagOn(userEmail: string | null | undefined): Promise<boolean> {
  return isFlagEnabled(HOUSEHOLDS_FLAG, { userKey: userEmail ?? null, segment: "user" });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Flag off → behave as if the feature doesn't exist (no household).
  if (!(await flagOn(user.email))) {
    return NextResponse.json({ household: null });
  }

  const ctx = await getHouseholdContextForUser(user.id);
  if (!ctx) return NextResponse.json({ household: null });

  // Never leak invite tokens to the client — strip before returning.
  return NextResponse.json({
    household: { id: ctx.household.id, name: ctx.household.name },
    myRole: ctx.myRole,
    members: ctx.members.map((m) => ({
      id: m.id,
      invited_email: m.invited_email,
      role: m.role,
      status: m.status,
      is_me: m.user_id === user.id,
    })),
  });
}

const CreateBody = z.object({
  partner_email: z.string().min(3).max(254),
  name: z.string().max(HOUSEHOLD_NAME_MAX).nullish(),
});

export const POST = withValidatedBody(CreateBody, async (req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await flagOn(user.email))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`household-create:${ip}`, 5, 60)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const partnerEmail = body.partner_email.trim().toLowerCase();
  if (!isValidEmail(partnerEmail) || isDisposableEmail(partnerEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const result = await createHouseholdWithInvite({
    userId: user.id,
    ownerEmail: user.email ?? "",
    partnerEmail,
    name: body.name ?? null,
  });

  if (!result.ok) {
    const status =
      result.error === "already_in_household"
        ? 409
        : result.error === "db_error"
          ? 500
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  // Resolve the inviter's display name for the email greeting (best-effort).
  let inviterName: string | null = null;
  try {
    const profile = await getInvestorProfile(user.id);
    inviterName = profile?.displayName ?? null;
  } catch {
    inviterName = null;
  }

  // Fire-and-forget the invite email — never block the response on Resend.
  void sendHouseholdInvite({
    inviteeEmail: partnerEmail,
    inviterName,
    householdName: result.household.name,
    inviteToken: result.invite.invite_token,
  }).catch((err) => {
    log.warn("household invite email failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  });

  return NextResponse.json(
    {
      household: { id: result.household.id, name: result.household.name },
      invited_email: partnerEmail,
    },
    { status: 201 },
  );
});

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await flagOn(user.email))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await deleteHousehold({ ownerUserId: user.id });
  if (!result.ok) {
    const status = result.error === "forbidden" ? 403 : result.error === "db_error" ? 500 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}

/**
 * /api/account/household/leave — leave a household, or (owner) revoke a member.
 *
 *   POST { action: "leave" }            — partner leaves the household
 *   POST { action: "revoke", member_id } — owner revokes a member/invite
 *
 * Owners cannot "leave" — they DELETE the household via DELETE /api/account/
 * household. Flag-gated (fail-closed → 404).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isFlagEnabled } from "@/lib/feature-flags";
import { isRateLimited } from "@/lib/rate-limit";
import { HOUSEHOLDS_FLAG, leaveHousehold, revokeMember } from "@/lib/households";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("leave") }),
  z.object({ action: z.literal("revoke"), member_id: z.string().uuid() }),
]);

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

  // Throttle membership mutations (leave / revoke).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`household-membership:${ip}`, 20, 60)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const result =
    body.action === "leave"
      ? await leaveHousehold({ userId: user.id })
      : await revokeMember({ ownerUserId: user.id, memberId: body.member_id });

  if (!result.ok) {
    const status =
      result.error === "forbidden" ? 403 : result.error === "db_error" ? 500 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  acceptPoolOffer,
  declinePoolOffer,
} from "@/lib/briefs/demand-pools-actions";
import { DEMAND_POOLS_FLAG } from "@/lib/briefs/demand-pools";

const log = logger("briefs:pool");

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    email: z.string().email().max(200),
    offer_id: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("decline"),
    email: z.string().email().max(200),
  }),
]);

/**
 * POST /api/briefs/[slug]/pool — a pool member accepts or declines a group
 * offer on their own brief. Email-as-key auth (the action verifies the email
 * matches the pool member). 404 when the `demand_pools` flag is off.
 *
 * accept  ⇒ debits the offering adviser through the ESTABLISHED accept path at
 *           a volume discount, unlocks contact, opens the standard chat.
 * decline ⇒ the member leaves the pool; nothing else happens (no money moves).
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (!(await isAllowed("briefs_pool", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "user" });
  if (!enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { slug } = await ctx.params;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  // Resolve the brief id from the slug (accept-flow only).
  const admin = createAdminClient();
  const { data: brief } = await admin
    .from("advisor_auctions")
    .select("id")
    .eq("slug", slug)
    .eq("flow_type", "accept")
    .maybeSingle();
  if (!brief) {
    return NextResponse.json({ error: "Brief not found." }, { status: 404 });
  }
  const briefId = brief.id as number;

  if (parsed.data.action === "decline") {
    const result = await declinePoolOffer({ briefId, consumerEmail: parsed.data.email });
    if (!result.ok) {
      return mapFailure(result.reason);
    }
    return NextResponse.json({ success: true, action: "decline" });
  }

  const result = await acceptPoolOffer({
    briefId,
    offerId: parsed.data.offer_id,
    consumerEmail: parsed.data.email,
  });
  if (!result.ok) {
    return mapFailure(result.reason);
  }

  log.info("pool offer actioned by member", {
    briefId,
    action: "accept",
    professionalId: result.professionalId,
    credits: result.creditsCharged,
  });
  return NextResponse.json({
    success: true,
    action: "accept",
    credits_charged: result.creditsCharged,
  });
}

function mapFailure(reason: string): NextResponse {
  const map: Record<string, { code: number; message: string }> = {
    flag_off: { code: 404, message: "Not found." },
    not_member: { code: 404, message: "This brief isn't part of a group." },
    email_mismatch: { code: 403, message: "That email doesn't match this request." },
    offer_not_found: { code: 404, message: "That offer is no longer available." },
    already_accepted: { code: 409, message: "You've already accepted an offer." },
    insufficient_credits: {
      code: 409,
      message: "The adviser can't be charged right now. Please try another offer.",
    },
    not_acceptable: { code: 409, message: "This request can no longer be accepted." },
    error: { code: 500, message: "Something went wrong." },
  };
  const m = map[reason] ?? { code: 400, message: "Could not complete that action." };
  return NextResponse.json({ error: m.message, reason }, { status: m.code });
}

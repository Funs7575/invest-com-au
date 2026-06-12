import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isFlagEnabled } from "@/lib/feature-flags";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPitch,
  getProspectNotifyTarget,
} from "@/lib/prospect-pool";
import { sendConsumerPitchReceived } from "@/lib/prospect-pool/emails";
import { PITCH_BODY_MAX_LENGTH } from "@/lib/prospect-pool/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api:advisor-portal:prospects:pitch");

const Body = z.object({
  prospectId: z.string().uuid(),
  body: z.string().trim().min(1).max(PITCH_BODY_MAX_LENGTH),
  feeBand: z.string().trim().max(60).optional().nullable(),
});

/**
 * POST /api/advisor-portal/prospects/pitch
 *
 * Send ONE structured pitch (general capability statement, <=300 chars) to a
 * prospect and debit the adviser's credits via the brief-accept money path.
 * Server-side guards enforce: moderation, cap-of-1 per prospect, decline
 * suppression, <=3 pitches/prospect/month, sufficient balance.
 *
 * Responses:
 *   200 { ok, creditsSpent, balanceAfterCents }
 *   422 { error, reasons } — moderation rejected
 *   409 — already pitched / previously declined / monthly cap reached
 *   402 — insufficient credits
 *   404 — flag off / prospect not found / prospect inactive
 */
export async function POST(request: NextRequest) {
  if (!(await isFlagEnabled("open_to_offers", { segment: "advisor" }))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!(await isAllowed("oto_pitch", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const result = await sendPitch({
    professionalId,
    prospectId: parsed.data.prospectId,
    body: parsed.data.body,
    feeBand: parsed.data.feeBand ?? null,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "moderation_rejected":
        return NextResponse.json(
          {
            error:
              "Your pitch can't be sent. Keep it a general statement of how you can help — no specific recommendations, price targets, or guarantees.",
            reasons: result.moderationReasons ?? [],
          },
          { status: 422 },
        );
      case "body_too_long":
        return NextResponse.json(
          { error: `Pitch must be 1–${PITCH_BODY_MAX_LENGTH} characters.` },
          { status: 400 },
        );
      case "already_pitched":
        return NextResponse.json(
          { error: "You've already pitched this prospect." },
          { status: 409 },
        );
      case "previously_declined":
        return NextResponse.json(
          { error: "This prospect declined a previous pitch from you." },
          { status: 409 },
        );
      case "monthly_cap_reached":
        return NextResponse.json(
          { error: "This prospect has reached their pitch limit this month." },
          { status: 409 },
        );
      case "insufficient_credits":
        return NextResponse.json(
          { error: "Not enough credits. Top up to send this pitch." },
          { status: 402 },
        );
      case "prospect_inactive":
      case "prospect_not_found":
      default:
        return NextResponse.json({ error: "Prospect is no longer available." }, { status: 404 });
    }
  }

  // Notify the consumer (preference-gated inside the email helper). Resolve the
  // pitching adviser's public name + firm for the email body.
  void (async () => {
    try {
      const admin = createAdminClient();
      const { data: pro } = await admin
        .from("professionals")
        .select("name, firm_name")
        .eq("id", professionalId)
        .maybeSingle();
      const target = await getProspectNotifyTarget(parsed.data.prospectId);
      if (target && pro) {
        await sendConsumerPitchReceived({
          userId: target.userId,
          consumerEmail: target.email,
          consumerFirstName: target.firstName,
          adviserName: (pro.name as string) ?? "A vetted adviser",
          adviserFirmName: (pro.firm_name as string | null) ?? null,
          pitchBody: parsed.data.body,
          feeBand: parsed.data.feeBand ?? null,
        });
      }
    } catch (err) {
      log.warn("pitch consumer-email dispatch failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  })();

  return NextResponse.json({
    ok: true,
    creditsSpent: result.creditsSpent,
    balanceAfterCents: result.balanceAfterCents,
  });
}

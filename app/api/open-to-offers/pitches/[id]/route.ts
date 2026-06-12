import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isFlagEnabled } from "@/lib/feature-flags";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { acceptPitch, declinePitch } from "@/lib/prospect-pool";
import {
  sendAdviserPitchAccepted,
  sendAdviserPitchDeclined,
} from "@/lib/prospect-pool/emails";
import { SITE_URL } from "@/lib/seo";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api:open-to-offers:decide");

const Body = z.object({
  action: z.enum(["accept", "decline"]),
});

/**
 * POST /api/open-to-offers/pitches/:id
 *
 *   accept  → reveal contact + bootstrap a brief-equivalent chat (the helper
 *             creates an already-accepted advisor_auctions row); returns the
 *             /briefs tracker link. Adviser emailed.
 *   decline → silent; the adviser's credits are refunded via the established
 *             refund primitive and the adviser is auto-suppressed from
 *             re-pitching this prospect. Adviser emailed.
 *
 * 404 when the feature flag is off. The :id is the pitch id (uuid); ownership
 * is enforced inside the helper against the authenticated user.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isFlagEnabled("open_to_offers", { segment: "user" }))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!(await isAllowed("oto_decide", ipKey(request), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  const { id: pitchId } = await ctx.params;

  if (parsed.data.action === "decline") {
    const result = await declinePitch({ userId: user.id, pitchId });
    if (!result.ok) {
      const status = result.reason === "pitch_not_found" ? 404 : 409;
      return NextResponse.json({ error: "Could not decline pitch." }, { status });
    }
    // Notify the adviser (fire-and-forget).
    if (result.adviserEmail) {
      void sendAdviserPitchDeclined({
        adviserEmail: result.adviserEmail,
        adviserName: result.adviserName,
        snapshot: result.snapshot,
        creditsRefunded: result.creditsRefunded,
      }).catch((err) => {
        log.warn("sendAdviserPitchDeclined failed", {
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }
    return NextResponse.json({ status: "declined" });
  }

  // accept — resolve the consumer's real contact details server-side (never
  // from the anonymised snapshot). Email is the chat key; name comes from the
  // user's profile when set. Phone stays null — the consumer can share it in
  // chat if they choose.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const contactName = (profile?.display_name as string | null) ?? null;

  const result = await acceptPitch({
    userId: user.id,
    pitchId,
    contactEmail: user.email,
    contactName,
    contactPhone: null,
  });
  if (!result.ok) {
    const status = result.reason === "pitch_not_found" ? 404 : result.reason === "not_pending" ? 409 : 500;
    return NextResponse.json({ error: "Could not accept pitch." }, { status });
  }

  // Notify the adviser their pitch was accepted (fire-and-forget).
  if (result.adviserEmail) {
    void sendAdviserPitchAccepted({
      adviserEmail: result.adviserEmail,
      adviserName: result.adviserName,
      snapshot: result.snapshot,
      briefSlug: result.briefSlug,
    }).catch((err) => {
      log.warn("sendAdviserPitchAccepted failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Tracker link the consumer opens to start chatting (email-key reveal).
  const trackerUrl = `${SITE_URL}/briefs/${result.briefSlug}?email=${encodeURIComponent(user.email)}`;
  return NextResponse.json({
    status: "accepted",
    briefSlug: result.briefSlug,
    trackerUrl,
  });
}

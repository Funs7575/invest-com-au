/**
 * POST /api/briefs/[slug]/accept-proposed-time — consumer taps one of the
 * adviser's proposed times to confirm the meeting.
 *
 * Flow:
 *   1. Verify the caller owns the brief (signed-in email OR contact_email body).
 *   2. Claim the chosen advisor_booking_appointments slot (atomic open→taken),
 *      cancelling the siblings.
 *   3. Mark the proposal message metadata as booked so the chat updates.
 *
 * Gated behind booking_v2 (fail-closed). Free booking — no payment.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  isBookingV2Enabled,
  acceptProposedTime,
} from "@/lib/booking-v2";
import type { ProposeTimesPayload } from "@/lib/booking-v2/types";

export const runtime = "nodejs";

const log = logger("api:briefs:accept-proposed-time");

const Body = z.object({
  message_id: z.number().int().positive(),
  appointment_id: z.number().int().positive(),
  contact_email: z.string().email().max(200).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (
      !(await isAllowed("briefs_accept_proposed", ipKey(request), {
        max: 20,
        refillPerSec: 20 / 600,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: briefRaw } = await admin
      .from("advisor_auctions")
      .select("id, contact_email, contact_name, accepted_by_professional_id")
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();
    if (!briefRaw) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    const brief = briefRaw as {
      id: number;
      contact_email: string | null;
      contact_name: string | null;
      accepted_by_professional_id: number | null;
    };

    // Resolve + authorise consumer identity (email-as-key or signed-in).
    let consumerEmail: string | null = null;
    if (parsed.data.contact_email) {
      const provided = parsed.data.contact_email.toLowerCase().trim();
      const expected = (brief.contact_email ?? "").toLowerCase().trim();
      if (!expected || expected !== provided) {
        return NextResponse.json(
          { error: "Email does not match brief owner." },
          { status: 403 },
        );
      }
      consumerEmail = provided;
    } else {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        return NextResponse.json(
          { error: "Sign in or provide contact_email." },
          { status: 401 },
        );
      }
      if ((brief.contact_email ?? "").toLowerCase() !== user.email.toLowerCase()) {
        return NextResponse.json({ error: "You do not own this brief." }, { status: 403 });
      }
      consumerEmail = user.email.toLowerCase();
    }

    if (!(await isBookingV2Enabled())) {
      return NextResponse.json({ error: "Not available." }, { status: 403 });
    }

    // Load the proposal message + verify it belongs to this brief and carries
    // the chosen appointment id.
    const { data: msgRaw } = await admin
      .from("brief_messages")
      .select("id, brief_id, metadata")
      .eq("id", parsed.data.message_id)
      .maybeSingle();
    if (!msgRaw || (msgRaw as { brief_id: number }).brief_id !== brief.id) {
      return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
    }
    const meta = (msgRaw as { metadata: ProposeTimesPayload | null }).metadata;
    if (!meta || meta.kind !== "propose_times") {
      return NextResponse.json({ error: "Not a time proposal." }, { status: 400 });
    }
    if (!meta.appointmentIds.includes(parsed.data.appointment_id)) {
      return NextResponse.json(
        { error: "That time isn't part of this proposal." },
        { status: 400 },
      );
    }
    if (meta.bookedAppointmentId) {
      return NextResponse.json(
        { error: "A time has already been booked from this proposal." },
        { status: 409 },
      );
    }

    const result = await acceptProposedTime({
      appointmentId: parsed.data.appointment_id,
      siblingIds: meta.appointmentIds,
      bookedByEmail: consumerEmail,
      bookedByName: brief.contact_name ?? consumerEmail,
    });
    if (!result.ok) {
      const status = result.error === "already_taken" ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Mark the message metadata as booked so the chat reflects the choice.
    const updatedMeta: ProposeTimesPayload = {
      ...meta,
      bookedAppointmentId: parsed.data.appointment_id,
    };
    await admin
      .from("brief_messages")
      .update({ metadata: updatedMeta as unknown as Record<string, unknown> })
      .eq("id", parsed.data.message_id);

    return NextResponse.json({ ok: true, appointmentId: parsed.data.appointment_id });
  } catch (err) {
    log.error("accept-proposed-time failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to confirm the time." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  cancelBooking,
  ConsultationError,
  getBooking,
  getSlot,
} from "@/lib/consultations";

const log = logger("consultations:cancel");

const Body = z.object({
  // Consumer-side email-as-key auth path; pro-side uses session.
  contact_email: z.string().email().max(200).optional(),
});

/**
 * POST /api/bookings/[id]/cancel — Either party cancels a booking.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("bookings_cancel", ipKey(request), {
        max: 30,
        refillPerSec: 0.5,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { id } = await ctx.params;
    const bookingId = Number(id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
    }

    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      // body is optional
    }
    const parsed = Body.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }

    const booking = await getBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    const slot = await getSlot(booking.slot_id);
    if (!slot) {
      return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    }

    // Resolve which party is cancelling.
    let byKind: "consumer" | "professional" | null = null;

    // Try pro session first.
    const advisorId = await requireAdvisorSession(request).catch(() => null);
    if (advisorId && slot.professional_id === advisorId) {
      byKind = "professional";
    }

    if (!byKind) {
      // Try consumer paths: signed-in OR email-key.
      if (parsed.data.contact_email) {
        if (
          parsed.data.contact_email.toLowerCase().trim() ===
          booking.consumer_email.toLowerCase().trim()
        ) {
          byKind = "consumer";
        }
      } else {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (
          user?.email &&
          user.email.toLowerCase() === booking.consumer_email.toLowerCase()
        ) {
          byKind = "consumer";
        }
      }
    }

    if (!byKind) {
      return NextResponse.json(
        { error: "You are not authorised to cancel this booking." },
        { status: 403 },
      );
    }

    const cancelled = await cancelBooking(bookingId, byKind);
    log.info("booking cancelled", { bookingId, byKind });

    // Optionally log a brief tracker event so the consumer page reflects it.
    try {
      const admin = createAdminClient();
      await admin.from("brief_tracker_events").insert({
        brief_id: booking.brief_id,
        event_type: "consultation_cancelled",
        actor_kind: byKind,
        payload: { booking_id: bookingId },
      });
    } catch {
      // best effort
    }

    return NextResponse.json({ success: true, booking: cancelled });
  } catch (err) {
    if (err instanceof ConsultationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    log.error("cancel error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to cancel booking." },
      { status: 500 },
    );
  }
}

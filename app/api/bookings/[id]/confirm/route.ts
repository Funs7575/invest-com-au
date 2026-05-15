import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  confirmBooking,
  ConsultationError,
  getBooking,
  getSlot,
} from "@/lib/consultations";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConsumerConsultationConfirmed } from "@/lib/marketplace-emails";

const log = logger("consultations:confirm");

const Body = z.object({
  meet_url: z.string().url().max(500).optional(),
});

/**
 * POST /api/bookings/[id]/confirm — Pro confirms a pending booking.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("bookings_confirm", ipKey(request), {
        max: 30,
        refillPerSec: 0.5,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
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

    const existing = await getBooking(bookingId);
    if (!existing) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    const slot = await getSlot(existing.slot_id);
    if (!slot) {
      return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    }
    if (slot.professional_id !== advisorId) {
      return NextResponse.json({ error: "Not your booking." }, { status: 403 });
    }

    const booking = await confirmBooking(bookingId, {
      meetUrl: parsed.data.meet_url ?? null,
    });

    log.info("booking confirmed", { bookingId, professionalId: advisorId });

    // ── Best-effort email to consumer ──
    void (async () => {
      try {
        const admin = createAdminClient();
        const { data: brief } = await admin
          .from("advisor_auctions")
          .select("slug, job_title, contact_name")
          .eq("id", booking.brief_id)
          .maybeSingle();
        const { data: pro } = await admin
          .from("professionals")
          .select("name")
          .eq("id", advisorId)
          .maybeSingle();
        if (brief?.slug) {
          await sendConsumerConsultationConfirmed({
            consumerEmail: booking.consumer_email,
            consumerName: (brief.contact_name as string) ?? "",
            providerName: (pro?.name as string) ?? "Your pro",
            briefTitle: (brief.job_title as string) ?? "Your consultation",
            briefSlug: brief.slug as string,
            startAt: slot.start_at,
            endAt: slot.end_at,
            meetUrl: booking.meet_url,
          });
        }
      } catch (err) {
        log.warn("confirm notification failed", {
          bookingId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return NextResponse.json({ success: true, booking });
  } catch (err) {
    if (err instanceof ConsultationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    log.error("confirm error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to confirm booking." },
      { status: 500 },
    );
  }
}

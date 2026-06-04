import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { cancelBooking, ConsultationError } from "@/lib/consultations";

const log = logger("consultations:cancel");

const Body = z.object({
  contact_email: z.string().email().max(200).optional(),
  booking_id: z.number().int().positive().optional(),
});

/**
 * POST /api/briefs/[slug]/booking/cancel — the consumer cancels their
 * consultation booking (AJ-7). `cancelBooking` frees the underlying slot, so
 * the consumer can immediately pick another time — reschedule = cancel + the
 * booking panel reverting to the slot picker.
 *
 * Auth mirrors /book-slot: email-as-key (contact_email matches the brief) OR
 * the signed-in Supabase user matching the brief's contact_email.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (!(await isAllowed("briefs_booking_cancel", ipKey(request), { max: 20, refillPerSec: 0.3 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { slug } = await ctx.params;
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

    const admin = createAdminClient();
    const { data: brief } = await admin
      .from("advisor_auctions")
      .select("id, contact_email")
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();
    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    const expected = ((brief.contact_email as string) ?? "").toLowerCase().trim();

    // Authorize: email-as-key, else the signed-in user matching the brief.
    if (parsed.data.contact_email) {
      if (!expected || expected !== parsed.data.contact_email.toLowerCase().trim()) {
        return NextResponse.json({ error: "Verification failed." }, { status: 403 });
      }
    } else {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        return NextResponse.json({ error: "Sign in or provide contact_email." }, { status: 401 });
      }
      if (expected !== user.email.toLowerCase()) {
        return NextResponse.json({ error: "You do not own this brief." }, { status: 403 });
      }
    }

    // Find the active booking for this brief (optionally pinned by booking_id).
    let query = admin
      .from("consultation_bookings")
      .select("id, status")
      .eq("brief_id", brief.id as number)
      .in("status", ["pending", "confirmed"]);
    if (parsed.data.booking_id) query = query.eq("id", parsed.data.booking_id);
    const { data: bookings } = await query.limit(1);
    const booking = bookings?.[0];
    if (!booking) {
      return NextResponse.json({ error: "No active booking to cancel." }, { status: 404 });
    }

    await cancelBooking(booking.id as number, "consumer");
    log.info("consultation cancelled by consumer", { briefId: brief.id, bookingId: booking.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ConsultationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    log.error("cancel error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to cancel booking." }, { status: 500 });
  }
}

/**
 * POST /api/booking/[token]/reschedule — tokenised one-time reschedule link.
 *
 * The reschedule_token in the URL is the auth factor. The consumer supplies a
 * new date+time; we validate it against the advisor's weekly availability and
 * (if free) cancel the old booking + create a new one, issuing the CANCEL/REQUEST
 * .ics pair. Gated behind booking_v2 (fail-closed).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  getBookingByRescheduleToken,
  isBookingV2Enabled,
  rescheduleBooking,
} from "@/lib/booking-v2";

export const runtime = "nodejs";

const log = logger("api:booking-reschedule");

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, "time must be HH:MM[:SS]"),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  if (!(await isAllowed("booking_reschedule", ipKey(req), { max: 10, refillPerSec: 10 / 600 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
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

  const booking = await getBookingByRescheduleToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (!(await isBookingV2Enabled())) {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }

  const result = await rescheduleBooking({
    bookingId: booking.id,
    newDate: parsed.data.date,
    newTime: parsed.data.time,
  });

  if (!result.ok) {
    log.info("reschedule failed", { bookingId: booking.id, error: result.error });
    const status =
      result.error === "already_taken"
        ? 409
        : result.error === "not_found"
          ? 404
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    newBookingId: result.newBookingId,
    // Hand back the fresh token so the manage page can redirect to the new
    // booking's management link.
    rescheduleToken: result.rescheduleToken,
  });
}

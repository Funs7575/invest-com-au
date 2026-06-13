/**
 * POST /api/booking/[token]/cancel — tokenised one-time cancel link.
 *
 * The reschedule_token in the URL is the auth factor (same posture as outcome /
 * engagement token links). Cancelling sends a METHOD:CANCEL .ics to both parties.
 * Idempotent: cancelling an already-cancelled booking succeeds.
 *
 * Gated behind booking_v2 (fail-closed). Tokens only exist on v2 bookings, so a
 * missing token is simply 404.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  cancelBooking,
  getBookingByRescheduleToken,
  isBookingV2Enabled,
} from "@/lib/booking-v2";

export const runtime = "nodejs";

const log = logger("api:booking-cancel");

const Body = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  if (!(await isAllowed("booking_cancel", ipKey(req), { max: 10, refillPerSec: 10 / 600 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsed = Body.safeParse(raw);
  const reason = parsed.success ? parsed.data.reason ?? null : null;

  const booking = await getBookingByRescheduleToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (!(await isBookingV2Enabled())) {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }

  const result = await cancelBooking(booking.id, reason);
  if (!result.ok) {
    log.info("cancel failed", { bookingId: booking.id, error: result.error });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, alreadyCancelled: result.alreadyCancelled ?? false });
}

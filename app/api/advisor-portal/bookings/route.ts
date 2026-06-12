/**
 * Advisor bookings list + outcome marking (booking-v2).
 *
 *   GET  — recent first-party bookings for the signed-in adviser.
 *   POST — mark a booking completed | no_show (one-tap from the portal).
 *
 * Auth: advisor session. Double-gated behind booking_v2 (fail-closed).
 *
 * No-show/completed feeds nothing downstream automatically — there's no clean
 * shared write path for booking-level outcomes today (the engagement registry +
 * brief outcomes are keyed off accepted briefs, not profile bookings). We record
 * the status on the advisor_bookings row; a future task can wire it into
 * lib/advisor-response-time.ts / provider_outcome_scores.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { isBookingV2Enabled, markBookingOutcome } from "@/lib/booking-v2";

export const runtime = "nodejs";

async function advisorEmail(advisorId: number): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("email")
    .eq("id", advisorId)
    .maybeSingle();
  return (data?.email as string | null) ?? null;
}

export async function GET(req: NextRequest) {
  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isBookingV2Enabled(await advisorEmail(advisorId)))) {
    return NextResponse.json({ enabled: false, bookings: [] });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_bookings")
    .select(
      "id, investor_name, investor_email, booking_date, booking_time, starts_at_utc, status, topic, booking_tz",
    )
    .eq("professional_id", advisorId)
    .order("starts_at_utc", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ enabled: true, bookings: data ?? [] });
}

const PostBody = z.object({
  booking_id: z.number().int().positive(),
  outcome: z.enum(["completed", "no_show"]),
});

export const POST = withValidatedBody(PostBody, async (req, body) => {
  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_booking_outcome:${ip}:${advisorId}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!(await isBookingV2Enabled(await advisorEmail(advisorId)))) {
    return NextResponse.json({ error: "Scheduling is not enabled." }, { status: 403 });
  }

  // Ownership: the booking must belong to this adviser.
  const admin = createAdminClient();
  const { data: owned } = await admin
    .from("advisor_bookings")
    .select("id")
    .eq("id", body.booking_id)
    .eq("professional_id", advisorId)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const result = await markBookingOutcome(body.booking_id, body.outcome);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
});

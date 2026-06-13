import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
// advisor_bookings holds investor PII (name/email/phone) + confirmation_token
// and is locked to non-anon RLS. This public route's availability/dedup reads
// and the insert are server-side logic returning only booking_time / id (never
// PII), so they use the service-role client; anon visitors never read the table.
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import {
  isBookingV2Enabled,
  newBookingToken,
  sendBookingPartiesEmail,
  DEFAULT_BOOKING_TZ,
} from "@/lib/booking-v2";
import { bookingStartUtc } from "@/lib/booking-v2/time";
import type { AdvisorBookingRow } from "@/lib/booking-v2/types";

const log = logger("advisor-booking");

// Permissive schema — the handler keeps its own required-field guard and also
// reads `sourcePage`, so fields stay optional and the body passes through.
const PostBody = z
  .object({
    advisorSlug: z.any(),
    investorName: z.any(),
    investorEmail: z.any(),
    investorPhone: z.any(),
    bookingDate: z.any(),
    bookingTime: z.any(),
    topic: z.any(),
    sourcePage: z.any(),
  })
  .passthrough();

// GET available slots for an advisor
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const advisorSlug = searchParams.get("advisor");
  const dateStr = searchParams.get("date"); // YYYY-MM-DD

  if (!advisorSlug) return NextResponse.json({ error: "Advisor slug required" }, { status: 400 });

  const supabase = await createClient();

  // Get advisor
  const { data: advisor } = await supabase
    .from("professionals")
    .select("id, name, booking_enabled, booking_link, booking_intro")
    .eq("slug", advisorSlug)
    .eq("status", "active")
    .single();

  if (!advisor) return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  if (!advisor.booking_enabled) return NextResponse.json({ advisor, slots: [], bookingEnabled: false });

  // Get their availability schedule.
  // NOTE: column is `slot_duration_minutes` (was previously mis-selected as
  // `slot_duration_mins`, which errored → schedule came back null and the
  // first-party picker silently rendered nothing). Fixed as part of booking-v2.
  const { data: schedule } = await supabase
    .from("advisor_booking_slots")
    .select("id, professional_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active")
    .eq("professional_id", advisor.id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  // If a specific date requested, check existing bookings
  let existingBookings: string[] = [];
  if (dateStr) {
    const { data: booked } = await createAdminClient()
      .from("advisor_bookings")
      .select("booking_time")
      .eq("professional_id", advisor.id)
      .eq("booking_date", dateStr)
      .neq("status", "cancelled");
    existingBookings = (booked || []).map(b => b.booking_time);
  }

  // booking-v2 surfaces an ICS invite + reschedule/cancel link in the
  // confirmation. The widget uses this to show the right copy. Fail-closed.
  let bookingV2 = false;
  try {
    const { data: proEmail } = await createAdminClient()
      .from("professionals")
      .select("email")
      .eq("id", advisor.id)
      .maybeSingle();
    bookingV2 = await isBookingV2Enabled((proEmail?.email as string) ?? null);
  } catch {
    bookingV2 = false;
  }

  return NextResponse.json({
    advisor: { id: advisor.id, name: advisor.name, booking_intro: advisor.booking_intro, booking_link: advisor.booking_link },
    schedule: schedule || [],
    existingBookings,
    bookingEnabled: true,
    bookingV2,
  });
}

// POST create a booking
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`booking:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const parsed = PostBody.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const body = parsed.data;
    const { advisorSlug, investorName, investorEmail, investorPhone, bookingDate, bookingTime, topic } = body;

    if (!advisorSlug || !investorName || !investorEmail || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: advisor } = await supabase
      .from("professionals")
      .select("id, name, email, booking_enabled")
      .eq("slug", advisorSlug)
      .eq("status", "active")
      .single();

    if (!advisor || !advisor.booking_enabled) {
      return NextResponse.json({ error: "Booking not available" }, { status: 400 });
    }

    // Check slot not already taken (service-role: advisor_bookings is non-anon)
    const { data: existing } = await admin
      .from("advisor_bookings")
      .select("id")
      .eq("professional_id", advisor.id)
      .eq("booking_date", bookingDate)
      .eq("booking_time", bookingTime)
      .neq("status", "cancelled")
      .single();

    if (existing) return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });

    // Scheduling-v2 gate (fail-closed). When on, we stamp the precise UTC
    // instant + reschedule/cancel tokens and send an ICS-attaching confirmation
    // via lib/booking-v2. When off, behaviour is exactly as before.
    const bookingV2 = await isBookingV2Enabled(advisor.email);
    const tz = DEFAULT_BOOKING_TZ;
    const startUtc = bookingV2
      ? bookingStartUtc(bookingDate as string, bookingTime as string, tz)
      : null;
    const confirmationToken = bookingV2 ? newBookingToken() : null;
    const rescheduleToken = bookingV2 ? newBookingToken() : null;

    // Create booking
    const { data: booking, error } = await admin
      .from("advisor_bookings")
      .insert({
        professional_id: advisor.id,
        investor_name: investorName,
        investor_email: investorEmail,
        investor_phone: investorPhone || null,
        booking_date: bookingDate,
        booking_time: bookingTime,
        topic: topic || null,
        source_page: body.sourcePage || null,
        ...(bookingV2
          ? {
              starts_at_utc: startUtc!.toISOString(),
              booking_tz: tz,
              confirmation_token: confirmationToken,
              reschedule_token: rescheduleToken,
            }
          : {}),
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });

    // Also create a lead for this advisor
    await supabase.from("professional_leads").insert({
      professional_id: advisor.id,
      user_name: investorName,
      user_email: investorEmail,
      user_phone: investorPhone || null,
      message: `Booking: ${bookingDate} at ${bookingTime}${topic ? ` — ${topic}` : ""}`,
      source_page: body.sourcePage || "/advisor-booking",
      status: "new",
    });

    // Send confirmation emails.
    // v2: route through lib/booking-v2 so both parties get an .ics invite and a
    // reschedule/cancel link. v1 (flag off): keep the existing plain-HTML sends.
    if (bookingV2 && booking) {
      await sendBookingPartiesEmail({
        booking: booking as AdvisorBookingRow,
        advisorName: advisor.name as string,
        advisorEmail: (advisor.email as string) ?? null,
        method: "REQUEST",
      });
      return NextResponse.json({ success: true, bookingId: booking.id });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const siteUrl = getSiteUrl();
    if (RESEND_API_KEY && advisor.email) {
      const dateFormatted = new Date(bookingDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
      // Email to advisor
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: advisor.email,
          subject: `New booking: ${investorName} on ${dateFormatted} at ${bookingTime}`,
          html: `<p><strong>${escapeHtml(investorName)}</strong> (${escapeHtml(investorEmail)}${investorPhone ? `, ${escapeHtml(investorPhone)}` : ""}) has booked a consultation with you on <strong>${escapeHtml(dateFormatted)} at ${escapeHtml(bookingTime)}</strong>.</p>${topic ? `<p>Topic: ${escapeHtml(topic)}</p>` : ""}<p><a href="${siteUrl}/advisor-portal">View in your dashboard →</a></p>`,
        }),
      });
      // Confirmation to investor
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: investorEmail,
          subject: `Booking confirmed: ${advisor.name} on ${dateFormatted}`,
          html: `<p>Your consultation with <strong>${escapeHtml(advisor.name)}</strong> is confirmed for <strong>${escapeHtml(dateFormatted)} at ${escapeHtml(bookingTime)} AEST</strong>.</p><p>${escapeHtml(advisor.name)} will contact you to confirm the meeting details.</p><p style="font-size: 12px; color: #94a3b8;">This booking was made through <a href="https://invest.com.au">Invest.com.au</a></p>`,
        }),
      });
    }

    return NextResponse.json({ success: true, bookingId: booking?.id });
  } catch (error) {
    log.error("Booking error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

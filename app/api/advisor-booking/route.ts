import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/url";

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

  // Get their availability schedule
  const { data: schedule } = await supabase
    .from("advisor_booking_slots")
    .select("id, professional_id, day_of_week, start_time, end_time, slot_duration_mins, is_active")
    .eq("professional_id", advisor.id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  // If a specific date requested, check existing bookings
  let existingBookings: string[] = [];
  if (dateStr) {
    const { data: booked } = await supabase
      .from("advisor_bookings")
      .select("booking_time")
      .eq("professional_id", advisor.id)
      .eq("booking_date", dateStr)
      .neq("status", "cancelled");
    existingBookings = (booked || []).map(b => b.booking_time);
  }

  return NextResponse.json({
    advisor: { id: advisor.id, name: advisor.name, booking_intro: advisor.booking_intro, booking_link: advisor.booking_link },
    schedule: schedule || [],
    existingBookings,
    bookingEnabled: true,
  });
}

// POST create a booking
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`booking:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const body = await request.json();
    const { advisorSlug, investorName, investorEmail, investorPhone, bookingDate, bookingTime, topic } = body;

    if (!advisorSlug || !investorName || !investorEmail || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: advisor } = await supabase
      .from("professionals")
      .select("id, name, email, booking_enabled")
      .eq("slug", advisorSlug)
      .eq("status", "active")
      .single();

    if (!advisor || !advisor.booking_enabled) {
      return NextResponse.json({ error: "Booking not available" }, { status: 400 });
    }

    // Check slot not already taken
    const { data: existing } = await supabase
      .from("advisor_bookings")
      .select("id")
      .eq("professional_id", advisor.id)
      .eq("booking_date", bookingDate)
      .eq("booking_time", bookingTime)
      .neq("status", "cancelled")
      .single();

    if (existing) return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });

    // Create booking
    const { data: booking, error } = await supabase
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
      })
      .select("id")
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

    // Send confirmation emails
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
          html: `<p><strong>${investorName}</strong> (${investorEmail}${investorPhone ? `, ${investorPhone}` : ""}) has booked a consultation with you on <strong>${dateFormatted} at ${bookingTime}</strong>.</p>${topic ? `<p>Topic: ${topic}</p>` : ""}<p><a href="${siteUrl}/advisor-portal">View in your dashboard →</a></p>`,
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
          html: `<p>Your consultation with <strong>${advisor.name}</strong> is confirmed for <strong>${dateFormatted} at ${bookingTime} AEST</strong>.</p><p>${advisor.name} will contact you to confirm the meeting details.</p><p style="font-size: 12px; color: #94a3b8;">This booking was made through <a href="https://invest.com.au">Invest.com.au</a></p>`,
        }),
      });
    }

    return NextResponse.json({ success: true, bookingId: booking?.id });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

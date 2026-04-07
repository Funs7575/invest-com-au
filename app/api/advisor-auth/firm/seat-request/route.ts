import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminNotification } from "@/lib/advisor-emails";
import { escapeHtml } from "@/lib/html-escape";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("advisor_session")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const supabase = await createClient();
    const { data: session } = await supabase
      .from("advisor_sessions")
      .select("professional_id, expires_at")
      .eq("session_token", sessionToken)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { data: advisor } = await supabase
      .from("professionals")
      .select("id, name, email, firm_id, is_firm_admin")
      .eq("id", session.professional_id)
      .single();

    if (!advisor?.is_firm_admin || !advisor.firm_id) {
      return NextResponse.json({ error: "Only firm admins can request seat upgrades" }, { status: 403 });
    }

    const { data: firm } = await supabase
      .from("advisor_firms")
      .select("name, max_seats")
      .eq("id", advisor.firm_id)
      .single();

    if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });

    const body = await request.json();
    const { requestedSeats, reason } = body;

    const parsedSeats = parseInt(String(requestedSeats));
    if (!parsedSeats || parsedSeats <= firm.max_seats || parsedSeats > 200) {
      return NextResponse.json({ error: `Requested seats must be more than current limit (${firm.max_seats}) and up to 200` }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Check for recent pending request
    const { data: recentRequest } = await adminSupabase
      .from("firm_seat_requests")
      .select("id")
      .eq("firm_id", advisor.firm_id)
      .eq("status", "pending")
      .single();

    if (recentRequest) {
      return NextResponse.json({ error: "You already have a pending seat upgrade request" }, { status: 409 });
    }

    await adminSupabase.from("firm_seat_requests").insert({
      firm_id: advisor.firm_id,
      requested_by: advisor.id,
      current_seats: firm.max_seats,
      requested_seats: parsedSeats,
      reason: reason?.trim()?.slice(0, 500) || null,
    });

    // Notify admin
    sendAdminNotification(
      `Seat upgrade request: ${firm.name}`,
      `<strong>${advisor.name}</strong> from <strong>${firm.name}</strong> has requested a seat upgrade.<br/>
      Current: ${firm.max_seats} seats → Requested: ${parsedSeats} seats<br/>
      ${reason ? `Reason: ${escapeHtml(reason)}` : "No reason provided"}<br/>
      <a href="https://invest.com.au/admin/advisors" style="color:#2563eb">Review in Admin →</a>`
    ).catch((err) => console.error("[seat-request] admin notification failed:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[seat-request] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

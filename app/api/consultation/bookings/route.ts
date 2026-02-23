import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const consultationId = request.nextUrl.searchParams.get("consultation_id");

    if (!consultationId) {
      return NextResponse.json(
        { error: "consultation_id is required" },
        { status: 400 }
      );
    }

    const { data: booking } = await supabase
      .from("consultation_bookings")
      .select("*")
      .eq("user_id", user.id)
      .eq("consultation_id", Number(consultationId))
      .in("status", ["pending", "confirmed", "completed"])
      .order("booked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ booking });
  } catch (err) {
    console.error("Consultation bookings GET error:", err);
    return NextResponse.json(
      { error: "Failed to load bookings" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("advisor_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: session } = await supabase
      .from("advisor_sessions")
      .select("professional_id, expires_at")
      .eq("session_token", sessionToken)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      const response = NextResponse.json({ error: "Session expired" }, { status: 401 });
      response.cookies.delete("advisor_session");
      return response;
    }

    const { data: advisor } = await supabase
      .from("professionals")
      .select("id, name, slug, firm_name, email, photo_url, type, location_display, rating, review_count, verified, bio, specialties, fee_structure, fee_description, website, phone, booking_link, booking_intro, offer_text, offer_terms, offer_active, firm_id, is_firm_admin, account_type, status, free_leads_used, lead_price_cents, credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents")
      .eq("id", session.professional_id)
      .single();

    if (!advisor) {
      return NextResponse.json({ error: "Account not found" }, { status: 401 });
    }

    return NextResponse.json({ advisor });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Logout
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("advisor_session")?.value;
    if (sessionToken) {
      const supabase = await createClient();
      await supabase.from("advisor_sessions").delete().eq("session_token", sessionToken);
    }
    const response = NextResponse.json({ success: true });
    response.cookies.delete("advisor_session");
    return response;
  } catch {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("advisor_session");
    return response;
  }
}

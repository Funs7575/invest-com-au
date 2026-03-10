import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/advisor-auth/session
 * 
 * Returns the current advisor session using Supabase Auth.
 * Falls back to legacy cookie-based auth for existing sessions.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // Try Supabase Auth first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Find advisor by auth_user_id or email
      const { data: advisor } = await admin
        .from("professionals")
        .select("id, name, slug, firm_name, email, photo_url, type, location_display, rating, review_count, verified, bio, specialties, fee_structure, fee_description, website, phone, booking_link, booking_intro, offer_text, offer_terms, offer_active, firm_id, is_firm_admin, account_type, status, free_leads_used, lead_price_cents, credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents, auth_user_id")
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        .in("status", ["active", "pending"])
        .maybeSingle();

      if (advisor) {
        // Ensure auth_user_id is linked
        if (!advisor.auth_user_id) {
          await admin.from("professionals").update({ 
            auth_user_id: user.id,
            last_login_at: new Date().toISOString(),
          }).eq("id", advisor.id);
        }
        return NextResponse.json({ advisor, authMethod: "supabase" });
      }
    }

    // Fallback: legacy cookie-based session (for existing logged-in advisors)
    const sessionToken = request.cookies.get("advisor_session")?.value;
    if (sessionToken) {
      const { data: session } = await admin
        .from("advisor_sessions")
        .select("professional_id, expires_at")
        .eq("session_token", sessionToken)
        .single();

      if (session && new Date(session.expires_at) > new Date()) {
        const { data: advisor } = await admin
          .from("professionals")
          .select("id, name, slug, firm_name, email, photo_url, type, location_display, rating, review_count, verified, bio, specialties, fee_structure, fee_description, website, phone, booking_link, booking_intro, offer_text, offer_terms, offer_active, firm_id, is_firm_admin, account_type, status, free_leads_used, lead_price_cents, credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents, auth_user_id")
          .eq("id", session.professional_id)
          .single();

        if (advisor) return NextResponse.json({ advisor, authMethod: "legacy" });
      }

      // Legacy session expired
      const response = NextResponse.json({ error: "Session expired" }, { status: 401 });
      response.cookies.delete("advisor_session");
      return response;
    }

    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Logout — handles both auth methods
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    
    // Sign out of Supabase Auth
    await supabase.auth.signOut();
    
    // Also clear legacy session if present
    const sessionToken = request.cookies.get("advisor_session")?.value;
    if (sessionToken) {
      await admin.from("advisor_sessions").delete().eq("session_token", sessionToken);
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

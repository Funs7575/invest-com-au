import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { sendApplicationConfirmation, sendAdminNotification } from "@/lib/advisor-emails";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`advisor_apply:${ip}`, 3, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const body = await request.json();
    const { name, firm_name, email, phone, type, afsl_number, registration_number, location_state, location_suburb, specialties, bio, website, fee_description, account_type, abn, photo_url } = body;

    if (!name?.trim() || !email?.trim() || !type) {
      return NextResponse.json({ error: "Name, email, and advisor type are required." }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if email already registered
    const { data: existing } = await supabase
      .from("professionals")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: "This email is already registered. Log in to your portal instead." }, { status: 409 });
    }

    // Check for pending application
    const { data: pendingApp } = await supabase
      .from("advisor_applications")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("status", "pending")
      .single();

    if (pendingApp) {
      return NextResponse.json({ error: "You already have a pending application. We'll review it within 48 hours." }, { status: 409 });
    }

    const { error } = await supabase.from("advisor_applications").insert({
      name: name.trim(),
      firm_name: firm_name?.trim() || null,
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      type,
      afsl_number: afsl_number?.trim() || null,
      registration_number: registration_number?.trim() || null,
      location_state: location_state || null,
      location_suburb: location_suburb?.trim() || null,
      specialties: specialties?.trim() || null,
      bio: bio?.trim() || null,
      website: website?.trim() || null,
      fee_description: fee_description?.trim() || null,
      account_type: account_type || null,
      abn: abn?.trim() || null,
      photo_url: photo_url?.trim() || null,
      referral_source: body.referral_source?.trim()?.slice(0, 200) || null,
    });

    if (error) {
      console.error("Application error:", error);
      return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
    }

    // Send confirmation email and admin notification
    sendApplicationConfirmation(email.toLowerCase().trim(), name.trim(), account_type || 'individual').catch((err) => console.error("[advisor-apply] confirmation email failed:", err));
    sendAdminNotification(
      `New advisor application: ${name.trim()}`,
      `<strong>${name.trim()}</strong> (${account_type === 'firm' ? 'Firm' : 'Individual'}) applied as ${type}.<br/>Email: ${email}<br/>Firm: ${firm_name || 'N/A'}<br/><a href="https://invest.com.au/admin/advisors" style="color:#2563eb">Review in Admin →</a>`
    ).catch((err) => console.error("[advisor-apply] admin notification failed:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Advisor apply error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

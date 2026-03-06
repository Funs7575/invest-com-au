import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`advisor_apply:${ip}`, 3, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const body = await request.json();
    const { name, firm_name, email, phone, type, afsl_number, registration_number, location_state, location_suburb, specialties, bio, website, fee_description } = body;

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
    });

    if (error) {
      console.error("Application error:", error);
      return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
    }

    // Send confirmation email
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: email.toLowerCase().trim(),
          subject: "Application received — Invest.com.au Advisor Directory",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #334155;">
              <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 18px;">Application Received</h1>
              </div>
              <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 15px;">Hi ${name.trim().split(" ")[0]},</p>
                <p style="font-size: 14px; color: #64748b;">Thanks for applying to join the Invest.com.au advisor directory. We'll review your application and verify your credentials within 48 hours.</p>
                <p style="font-size: 14px; color: #64748b;">Once approved, you'll receive a link to set up your profile and start receiving enquiries.</p>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">Questions? Reply to this email.</p>
              </div>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Advisor apply error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

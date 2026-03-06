import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (DB-backed, survives serverless cold starts)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`enquiry:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const { professional_id, user_name, user_email, user_phone, message, source_page } = body;

    // Validation
    if (!professional_id || !user_name?.trim() || !user_email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify the professional exists and is active
    const { data: pro, error: proError } = await supabase
      .from("professionals")
      .select("id, name, email, firm_name, type")
      .eq("id", professional_id)
      .eq("status", "active")
      .single();

    if (proError || !pro) {
      return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
    }

    // Create the lead record
    const { data: lead, error: leadError } = await supabase
      .from("professional_leads")
      .insert({
        professional_id,
        user_name: user_name.trim(),
        user_email: user_email.trim().toLowerCase(),
        user_phone: user_phone?.trim() || null,
        message: message?.trim() || null,
        source_page: source_page || null,
        status: "new",
      })
      .select()
      .single();

    if (leadError) {
      console.error("Failed to create lead:", leadError);
      return NextResponse.json({ error: "Failed to submit enquiry." }, { status: 500 });
    }

    // Send notification email to the advisor (if they have an email)
    if (pro.email) {
      try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";
        if (RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Invest.com.au <leads@invest.com.au>",
              to: pro.email,
              subject: `New Enquiry from ${user_name.trim()} — Invest.com.au`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #0f172a; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                    <h2 style="margin: 0; font-size: 18px;">New Consultation Request</h2>
                    <p style="margin: 4px 0 0; opacity: 0.7; font-size: 13px;">via Invest.com.au</p>
                  </div>
                  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; width: 100px;">Name</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${user_name.trim()}</td></tr>
                      <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${user_email.trim()}" style="color: #2563eb;">${user_email.trim()}</a></td></tr>
                      ${user_phone ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Phone</td><td style="padding: 8px 0; font-size: 14px;"><a href="tel:${user_phone.trim()}" style="color: #2563eb;">${user_phone.trim()}</a></td></tr>` : ""}
                      ${message ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; vertical-align: top;">Message</td><td style="padding: 8px 0; font-size: 14px; line-height: 1.5;">${message.trim().replace(/\n/g, "<br>")}</td></tr>` : ""}
                    </table>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                      <a href="mailto:${user_email.trim()}?subject=Re: Your enquiry on Invest.com.au" style="display: inline-block; padding: 10px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Reply to ${user_name.trim().split(" ")[0]}</a>
                      <a href="${siteUrl}/advisor-portal" style="display: inline-block; margin-left: 8px; padding: 10px 24px; background: #f1f5f9; color: #334155; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">View in Dashboard</a>
                    </div>
                    <p style="margin-top: 16px; font-size: 11px; color: #94a3b8;">This lead was generated via your listing on invest.com.au. We recommend responding within 24 hours for the best chance of conversion.</p>
                  </div>
                </div>
              `,
            }),
          });
        }
      } catch (emailError) {
        // Don't fail the request if email fails — lead is still saved
        console.error("Failed to send advisor notification:", emailError);
      }
    }

    // Send confirmation email to the user
    try {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Invest.com.au <hello@invest.com.au>",
            to: user_email.trim().toLowerCase(),
            subject: `Your enquiry to ${pro.name} — Invest.com.au`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a;">Enquiry Sent!</h2>
                <p>Hi ${user_name.trim().split(" ")[0]},</p>
                <p>Your consultation request has been sent to <strong>${pro.name}</strong>${pro.firm_name ? ` at ${pro.firm_name}` : ""}. They typically respond within 24 hours.</p>
                <p style="color: #64748b; font-size: 13px;">This is a no-obligation enquiry. You're under no commitment to proceed.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 13px; color: #94a3b8;">Invest.com.au — Australia's independent investing hub</p>
              </div>
            `,
          }),
        });
      }
    } catch {
      // Don't fail if confirmation email fails
    }

    // Track the event
    try {
      await supabase.from("analytics_events").insert({
        event_type: "advisor_lead",
        page: source_page || `/advisor/${professional_id}`,
        broker_slug: null,
        metadata: { professional_id, type: pro.type },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (error) {
    console.error("Advisor enquiry error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

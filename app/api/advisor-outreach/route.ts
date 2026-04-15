import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("advisor-outreach");

export async function POST(request: NextRequest) {
  try {
    // Admin-only: this sends emails on behalf of the platform
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user || !getAdminEmails().includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`advisor_outreach:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const { to_email, to_name, firm_name, advisor_type } = body;

    if (!to_email || !to_name) {
      return NextResponse.json({ error: "Email and name required" }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Email not configured" }, { status: 500 });
    }

    const typeLabels: Record<string, string> = {
      smsf_accountant: "SMSF Accountant",
      financial_planner: "Financial Planner",
      property_advisor: "Property Advisor",
      tax_agent: "Tax Agent",
      mortgage_broker: "Mortgage Broker",
      estate_planner: "Estate Planner",
    };
    const typeLabel = typeLabels[advisor_type] || "Financial Professional";
    const firstName = to_name.split(" ")[0];

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Invest.com.au <hello@invest.com.au>",
        to: to_email,
        subject: `Free listing for ${firm_name || to_name} on Invest.com.au`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Invest.com.au</h1>
              <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Australia's independent investing hub</p>
            </div>
            
            <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
              
              <p style="font-size: 15px; line-height: 1.6;">
                I'm reaching out because we're building Australia's independent investing hub at
                <a href="https://invest.com.au" style="color: #2563eb;">Invest.com.au</a>, and we'd like to feature 
                ${firm_name ? `<strong>${firm_name}</strong>` : "your practice"} in our new 
                <a href="https://invest.com.au/advisors" style="color: #2563eb;">${typeLabel} directory</a>.
              </p>

              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="font-size: 16px; margin: 0 0 12px; color: #0f172a;">What we're offering</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; vertical-align: top; width: 24px; color: #16a34a; font-weight: bold;">✓</td>
                    <td style="padding: 8px 0; font-size: 14px;"><strong>Free listing</strong> — your profile on our site at no cost</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; vertical-align: top; width: 24px; color: #16a34a; font-weight: bold;">✓</td>
                    <td style="padding: 8px 0; font-size: 14px;"><strong>Verified badge</strong> — we verify your AFSL/registration</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; vertical-align: top; width: 24px; color: #16a34a; font-weight: bold;">✓</td>
                    <td style="padding: 8px 0; font-size: 14px;"><strong>Enquiry leads</strong> — investors can request consultations directly</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; vertical-align: top; width: 24px; color: #16a34a; font-weight: bold;">✓</td>
                    <td style="padding: 8px 0; font-size: 14px;"><strong>Pay nothing now</strong> — we'll discuss per-enquiry pricing once you're seeing results</td>
                  </tr>
                </table>
              </div>

              <h2 style="font-size: 16px; margin: 20px 0 12px; color: #0f172a;">Who visits our site</h2>
              <p style="font-size: 14px; line-height: 1.6;">
                Our audience is Australian investors actively comparing platforms and looking for professional help.
                We cross-link our ${typeLabel.toLowerCase()} directory from our platform comparison pages, 
                quiz results, calculators, and educational guides — reaching users at the exact moment they're 
                considering professional advice.
              </p>

              <h2 style="font-size: 16px; margin: 20px 0 12px; color: #0f172a;">What we need from you</h2>
              <p style="font-size: 14px; line-height: 1.6;">
                Just reply to this email with:
              </p>
              <ol style="font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>Your name and firm name</li>
                <li>AFSL or registration number</li>
                <li>Location (suburb + state)</li>
                <li>Specialties (e.g., SMSF Setup, Retirement Planning)</li>
                <li>Fee range (e.g., "From $2,200/yr" or "SOA from $3,300")</li>
                <li>A short bio (2-3 sentences)</li>
                <li>A professional photo (optional but recommended — 3x more enquiries)</li>
              </ol>
              <p style="font-size: 14px; line-height: 1.6;">
                We'll set up your profile and send you a link to review before it goes live.
              </p>

              <div style="text-align: center; margin: 24px 0;">
                <a href="mailto:hello@invest.com.au?subject=Advisor listing for ${encodeURIComponent(firm_name || to_name)}" style="display: inline-block; padding: 12px 32px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Reply to Get Listed →</a>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748b;">
                If this isn't relevant to you, no worries — just ignore this email. We won't follow up.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                Invest.com.au — Australia's independent investing platform comparison and advisor directory.
                <br />
                <a href="https://invest.com.au/advisors" style="color: #2563eb;">invest.com.au/advisors</a>
              </p>
            </div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Outreach email error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

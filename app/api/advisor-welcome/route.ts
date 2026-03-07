import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, firm_name, slug, type } = body;

    if (!name || !email || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const profileUrl = `https://invest.com.au/advisor/${slug}`;
    const typeLabels: Record<string, string> = {
      smsf_accountant: "SMSF Accountant",
      financial_planner: "Financial Planner",
      property_advisor: "Property Advisor",
      tax_agent: "Tax Agent",
      mortgage_broker: "Mortgage Broker",
      estate_planner: "Estate Planner",
    };
    const typeLabel = typeLabels[type] || "Financial Professional";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Invest.com.au <hello@invest.com.au>",
        to: email,
        subject: `Welcome to Invest.com.au — Your ${typeLabel} Profile is Live`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Welcome to Invest.com.au</h1>
              <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Your ${typeLabel} profile is now live</p>
            </div>
            
            <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 15px; line-height: 1.6;">Hi ${name.split(" ")[0]},</p>
              
              <p style="font-size: 15px; line-height: 1.6;">
                Your profile${firm_name ? ` for <strong>${firm_name}</strong>` : ""} is now live on Invest.com.au. 
                Australian investors can find you, view your qualifications, and request a free consultation directly through your profile.
              </p>

              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="font-size: 13px; color: #64748b; margin: 0 0 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your Profile</p>
                <p style="font-size: 16px; font-weight: 700; margin: 0 0 4px;">${name}${firm_name ? ` — ${firm_name}` : ""}</p>
                <p style="font-size: 13px; color: #64748b; margin: 0 0 12px;">${typeLabel}</p>
                <a href="${profileUrl}" style="display: inline-block; padding: 10px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">View Your Profile →</a>
              </div>

              <h2 style="font-size: 16px; margin: 24px 0 12px;">How it works</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; vertical-align: top; width: 32px; font-weight: 700; color: #f59e0b;">1.</td>
                  <td style="padding: 8px 0; font-size: 14px;">Investors find you through our directory, search, or contextual prompts across the site.</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; vertical-align: top; width: 32px; font-weight: 700; color: #f59e0b;">2.</td>
                  <td style="padding: 8px 0; font-size: 14px;">They submit an enquiry with their name, email, and what they need help with.</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; vertical-align: top; width: 32px; font-weight: 700; color: #f59e0b;">3.</td>
                  <td style="padding: 8px 0; font-size: 14px;">You receive their details via email — respond directly to start the conversation.</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; vertical-align: top; width: 32px; font-weight: 700; color: #f59e0b;">4.</td>
                  <td style="padding: 8px 0; font-size: 14px;"><strong>Your listing is free.</strong> We only charge per enquiry once we agree terms.</td>
                </tr>
              </table>

              <h2 style="font-size: 16px; margin: 24px 0 12px;">Tips to maximise enquiries</h2>
              <ul style="padding-left: 20px; font-size: 14px; line-height: 1.8;">
                <li>Add a professional photo — profiles with photos get 3x more enquiries</li>
                <li>Write a detailed bio highlighting your experience and approach</li>
                <li>List specific specialties (e.g., "SMSF Setup" not just "SMSF")</li>
                <li>Include your fee range so investors know what to expect</li>
                <li>Respond to enquiries within 24 hours for best conversion</li>
              </ul>

              <p style="font-size: 14px; line-height: 1.6; margin-top: 24px;">
                Want to update your profile? Log in to your <a href="https://invest.com.au/advisor-portal" style="color: #7c3aed; font-weight: 600;">Advisor Portal</a> to manage your listing, view leads, and write expert articles. Or reply to this email with any changes.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                Invest.com.au — Australia's independent investing platform comparison and advisor directory.
                <br />Questions? Reply to this email or contact us at hello@invest.com.au
              </p>
            </div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

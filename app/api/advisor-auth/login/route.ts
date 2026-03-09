import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { isRateLimited } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/url";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // Rate limit: max 5 magic links per email per hour
    if (await isRateLimited(`magic_link:${email.toLowerCase().trim()}`, 5, 60)) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const supabase = await createClient();

    // Find advisor by email
    const { data: advisor } = await supabase
      .from("professionals")
      .select("id, name, email")
      .eq("email", email.toLowerCase().trim())
      .in("status", ["active", "pending"])
      .single();

    if (!advisor) {
      // Don't reveal if email exists — always return success
      return NextResponse.json({ success: true });
    }

    // Generate magic link token (valid 15 minutes)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase.from("advisor_auth_tokens").insert({
      professional_id: advisor.id,
      token,
      expires_at: expiresAt,
    });

    // Send email with magic link
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const siteUrl = getSiteUrl(request.headers.get("host"));

    if (RESEND_API_KEY) {
      const loginUrl = `${siteUrl}/advisor-portal?token=${token}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: email,
          subject: "Your Advisor Portal Login Link",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #334155;">
              <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 18px;">Invest.com.au — Advisor Portal</h1>
              </div>
              <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 15px;">Hi ${advisor.name?.split(" ")[0] || "there"},</p>
                <p style="font-size: 14px; color: #64748b;">Click the button below to log into your advisor dashboard. This link expires in 15 minutes.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${loginUrl}" style="display: inline-block; padding: 12px 32px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Log In to Dashboard →</a>
                </div>
                <p style="font-size: 12px; color: #94a3b8;">If you didn't request this, ignore this email. The link will expire automatically.</p>
              </div>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Advisor auth error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

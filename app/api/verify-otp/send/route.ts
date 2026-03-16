import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isValidEmail } from "@/lib/validate-email";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "edge";

/**
 * POST /api/verify-otp/send
 * Generates a 6-digit OTP and emails it to the provided address.
 * Rate-limited to 5 sends per IP per 10 minutes.
 */
export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (await isRateLimited(`otp-send:${ip}`, 5, 10)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let email: string;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const supabase = createAdminClient();

  // Invalidate any previous unused OTPs for this email
  await supabase
    .from("email_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("email", normalizedEmail)
    .is("used_at", null);

  await supabase.from("email_otps").insert({ email: normalizedEmail, code, expires_at: expiresAt });

  // Send email via Resend
  const key = process.env.RESEND_API_KEY;
  if (key) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: "Invest.com.au <hello@invest.com.au>",
        to: normalizedEmail,
        subject: `${code} is your Invest.com.au verification code`,
        html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto">
          <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:18px">Verify your email</h1>
          </div>
          <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p style="font-size:14px;color:#64748b;margin:0 0 16px">Enter this code in the advisor matching form:</p>
            <div style="background:white;border:2px solid #f59e0b;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px">
              <span style="font-size:36px;font-weight:800;letter-spacing:0.15em;color:#0f172a">${code}</span>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin:0">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
          </div>
        </div>`,
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ success: true });
}

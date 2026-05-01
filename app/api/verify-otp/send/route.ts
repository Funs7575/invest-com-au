import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "edge";

const log = logger("api/verify-otp/send");

const Body = z.object({ email: z.string() });

/**
 * POST /api/verify-otp/send
 * Generates a 6-digit OTP and emails it via Resend.
 * Rate-limited to 5 sends per IP per 10 minutes.
 *
 * Failure semantics: if the email cannot be sent (missing API key, Resend
 * outage, non-2xx response), we return 502 in production so the UI surfaces
 * a real error instead of silently advancing to the "enter code" step. In
 * development, a missing key is tolerated (warned) so local flows work
 * without Resend credentials.
 */
export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (await isRateLimited(`otp-send:${ip}`, 5, 10)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email } = parsed.data;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const code = String(100000 + (arr[0] % 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const supabase = createAdminClient();

  // Invalidate any previous unused OTPs for this email
  await supabase
    .from("email_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("email", normalizedEmail)
    .is("used_at", null);

  await supabase.from("email_otps").insert({ email: normalizedEmail, code, expires_at: expiresAt });

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      log.error("RESEND_API_KEY missing — verification email not sent", { email: normalizedEmail });
      return NextResponse.json(
        { error: "Email service is not configured. Please contact support." },
        { status: 503 },
      );
    }
    log.warn("RESEND_API_KEY missing — skipping send (dev mode)", { email: normalizedEmail });
    return NextResponse.json({ success: true, devSkipped: true });
  }

  let resendRes: Response;
  try {
    resendRes = await fetch("https://api.resend.com/emails", {
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
    });
  } catch (err) {
    log.error("Resend request threw", { err, email: normalizedEmail });
    return NextResponse.json(
      { error: "We couldn't send the verification email. Please try again." },
      { status: 502 },
    );
  }

  if (!resendRes.ok) {
    // Pull the error body for diagnostics — Resend returns JSON like
    // { statusCode, name, message } on 4xx (e.g. unverified domain).
    const body = await resendRes.text().catch(() => "<unreadable>");
    log.error("Resend returned non-OK", {
      status: resendRes.status,
      body: body.slice(0, 500),
      email: normalizedEmail,
    });
    return NextResponse.json(
      { error: "We couldn't send the verification email. Please try again." },
      { status: 502 },
    );
  }

  log.info("OTP email sent", { email: normalizedEmail });
  return NextResponse.json({ success: true });
}

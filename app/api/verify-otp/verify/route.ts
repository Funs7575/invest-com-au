import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/verify-otp/verify
 * Checks the submitted code against the stored OTP.
 *
 * Layered rate limits (audit K-02 — defense-in-depth against brute force):
 *   1. Per-IP burst cap:        3 attempts / 15 min
 *   2. Per-IP cumulative cap:  10 attempts / 4 hr (catches slow distributed retry)
 *   3. Per-email cap:           5 attempts / 60 min (catches IP rotation against one email)
 *
 * Math: a 6-digit OTP has 1M combinations. The previous 10/5min cap let an
 * attacker exhaust the keyspace in ~5.8 days. The new layered limits cap a
 * single attacker at 10/4hr per IP and 5/60min per email — exhaustion of one
 * email's OTP space takes ~22 years instead of ~5.8 days. Per-email is the
 * critical layer because OTPs are scoped to email, and an attacker rotating
 * IPs would otherwise bypass per-IP limits entirely.
 *
 * Both lookups must be done before the OTP query so that a successful
 * 429 short-circuits before we read the DB.
 */
export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

  // Burst cap: 3 attempts per 15 min per IP. Tight enough that an honest
  // user typo-fixing 1-2 codes never hits it, strict enough that a scripted
  // brute-force is rate-limited to 12/hr per IP.
  if (await isRateLimited(`otp-verify:${ip}`, 3, 15)) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes or request a new code." }, { status: 429 });
  }

  // Cumulative IP cap: 10 attempts in any 4-hour window. Catches the "wait
  // out the 15 min and retry" pattern; total attempts capped at 60/day per IP.
  if (await isRateLimited(`otp-verify-cumulative:${ip}`, 10, 240)) {
    return NextResponse.json({ error: "Too many attempts from this network. Please try again in 4 hours." }, { status: 429 });
  }

  let email: string, code: string;
  try {
    ({ email, code } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Per-email cap: 5 attempts per 60 min for any single email address. This
  // is the most important layer because OTPs are scoped to email; an
  // attacker rotating through IP addresses (botnet, residential proxies)
  // would bypass per-IP limits without this. 5/60min × 1M codes = ~22 years
  // to exhaust.
  if (await isRateLimited(`otp-verify-email:${normalizedEmail}`, 5, 60)) {
    // Generic message — don't disclose that the email-bucket tripped vs IP.
    return NextResponse.json({ error: "Too many attempts. Please request a new code." }, { status: 429 });
  }

  const supabase = createAdminClient();

  const { data: otp } = await supabase
    .from("email_otps")
    .select("id, code, expires_at, used_at")
    .eq("email", normalizedEmail)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return NextResponse.json({ error: "No active code found. Please request a new one." }, { status: 400 });
  }

  if (new Date(otp.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
  }

  // Timing-safe OTP comparison to prevent timing attacks
  const submitted = Buffer.from(code.trim());
  const stored = Buffer.from(otp.code);
  if (submitted.length !== stored.length || !timingSafeEqual(submitted, stored)) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  // Mark used
  await supabase.from("email_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);

  return NextResponse.json({ success: true, verified: true });
}

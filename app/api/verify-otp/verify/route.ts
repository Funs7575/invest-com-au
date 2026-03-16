import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "edge";

/**
 * POST /api/verify-otp/verify
 * Checks the submitted code against the stored OTP.
 * Rate-limited to 10 attempts per IP per 5 minutes to prevent brute force.
 */
export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (await isRateLimited(`otp-verify:${ip}`, 10, 5)) {
    return NextResponse.json({ error: "Too many attempts. Please request a new code." }, { status: 429 });
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

  if (otp.code !== code.trim()) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  // Mark used
  await supabase.from("email_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);

  return NextResponse.json({ success: true, verified: true });
}

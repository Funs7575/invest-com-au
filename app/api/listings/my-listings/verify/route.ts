import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import {
  signListingOwnerCookie,
  LISTING_OWNER_COOKIE_NAME,
  LISTING_OWNER_COOKIE_MAX_AGE_S,
} from "@/lib/listing-owner-cookie";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api/listings/my-listings/verify");

const Body = z.object({
  email: z.string(),
  code: z.string(),
});

/**
 * POST /api/listings/my-listings/verify
 *
 * Verifies an OTP that was sent via /api/verify-otp/send for the
 * listing-owner contact email, and on success issues a signed
 * `listing_owner_verified` cookie (1h TTL) that
 * /api/listings/my-listings reads to authorise the
 * listings + enquiries lookup.
 *
 * This route mirrors the rate-limit + timing-safe check pattern of
 * /api/verify-otp/verify but is purpose-specific so the OTP-verified
 * cookie is only issued when the caller is intentionally completing
 * the my-listings gate (B-09a). /api/verify-otp/verify itself stays
 * generic — the find-advisor flow that uses it does not need (and
 * should not get) a long-lived listing-owner cookie.
 *
 * Body: { email: string, code: string }
 *
 * Status codes:
 *   200 — code valid, cookie set
 *   400 — bad input or wrong/expired code
 *   429 — rate-limited
 *
 * Layered rate limits (audit K-02 — defense-in-depth against brute force):
 *   1. Per-IP burst cap:        3 attempts / 15 min
 *   2. Per-IP cumulative cap:  10 attempts / 4 hr
 *   3. Per-email cap:           5 attempts / 60 min
 */
export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown")
    .split(",")[0]
    ?.trim() ?? "unknown";

  if (await isRateLimited(`my-listings-verify:${ip}`, 3, 15)) {
    return NextResponse.json(
      {
        error:
          "Too many attempts. Please wait 15 minutes or request a new code.",
      },
      { status: 429 },
    );
  }
  if (await isRateLimited(`my-listings-verify-cumulative:${ip}`, 10, 240)) {
    return NextResponse.json(
      {
        error:
          "Too many attempts from this network. Please try again in 4 hours.",
      },
      { status: 429 },
    );
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

  const email = parsed.data.email.trim();
  const code = parsed.data.code.trim();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!code) {
    return NextResponse.json(
      { error: "Code is required." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase();

  // Per-email cap (B-09a — most important layer because OTPs are
  // scoped to email; an attacker rotating IPs would otherwise bypass
  // per-IP limits).
  if (
    await isRateLimited(`my-listings-verify-email:${normalizedEmail}`, 5, 60)
  ) {
    return NextResponse.json(
      { error: "Too many attempts. Please request a new code." },
      { status: 429 },
    );
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
    return NextResponse.json(
      { error: "No active code found. Please request a new one." },
      { status: 400 },
    );
  }

  if (new Date(otp.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Code has expired. Please request a new one." },
      { status: 400 },
    );
  }

  // Timing-safe OTP comparison to prevent timing attacks.
  const submitted = Buffer.from(code);
  const stored = Buffer.from(otp.code);
  if (
    submitted.length !== stored.length ||
    !timingSafeEqual(submitted, stored)
  ) {
    return NextResponse.json(
      { error: "Incorrect code. Please try again." },
      { status: 400 },
    );
  }

  // Mark used so the same code cannot be replayed.
  await supabase
    .from("email_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("id", otp.id);

  // Issue the signed listing-owner cookie.
  let cookieValue: string;
  try {
    cookieValue = signListingOwnerCookie(normalizedEmail);
  } catch (err) {
    log.error("Failed to sign listing-owner cookie", {
      email: normalizedEmail,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error:
          "Verification service is not configured. Please contact support.",
      },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true, verified: true });
  response.cookies.set({
    name: LISTING_OWNER_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LISTING_OWNER_COOKIE_MAX_AGE_S,
  });
  log.info("listing-owner verified", { email: normalizedEmail });
  return response;
}

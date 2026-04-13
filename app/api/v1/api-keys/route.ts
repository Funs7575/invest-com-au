import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import { API_CORS_HEADERS } from "@/lib/api-auth";
import { randomBytes, createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-api-keys");

const MAX_KEYS_PER_EMAIL = 3;

/**
 * Simple email validation.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * SHA-256 hash a string (synchronous, using Node crypto).
 */
function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * OPTIONS /api/v1/api-keys — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * POST /api/v1/api-keys
 *
 * Request a new API key for the Financial Planner API.
 *
 * Body: { email, name, company_name?, use_case? }
 *
 * - Generates a cryptographically secure key: ica_<32-hex-chars>
 * - Stores a SHA-256 hash (plain key is never stored)
 * - Returns the plain key exactly once
 * - Max 3 keys per email address
 * - Sends a confirmation email via Resend
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limit by IP — 5 requests per hour
  if (await isRateLimited(`api_key_create:${ip}`, 5, 60)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: API_CORS_HEADERS },
    );
  }

  try {
    const body = await request.json();

    // ── Validate required fields ──
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    // Per-email rate limit — separate from per-IP so an attacker can't
    // simply rotate IPs to bombard a target address with "API key
    // created" notification emails. Combined with the IP limit this
    // means: worst case an unrelated user receives 1 notification per
    // day regardless of how many attackers try to provision keys in
    // their name.
    if (await isRateLimited(`api_key_email:${email}`, 1, 60 * 24)) {
      return NextResponse.json(
        { error: "Too many requests for this email address. Please try again tomorrow." },
        { status: 429, headers: API_CORS_HEADERS },
      );
    }

    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "A name for the API key is required (2-100 characters)" },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    const companyName =
      typeof body.company_name === "string"
        ? body.company_name.trim().slice(0, 200)
        : null;
    const useCase =
      typeof body.use_case === "string"
        ? body.use_case.trim().slice(0, 500)
        : null;

    const supabase = createAdminClient();

    // ── Check existing key count for this email ──
    const { count, error: countError } = await supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("owner_email", email);

    if (countError) {
      log.error("Failed to count existing keys", { error: countError.message });
      return NextResponse.json(
        { error: "Failed to process request" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    if ((count || 0) >= MAX_KEYS_PER_EMAIL) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_KEYS_PER_EMAIL} API keys per email address. Contact api@invest.com.au for additional keys.`,
        },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    // ── Generate API key ──
    const rawKeyBytes = randomBytes(32).toString("hex");
    const plainKey = `ica_${rawKeyBytes}`;
    const keyHash = sha256(plainKey);
    const keyPrefix = plainKey.slice(0, 8); // "ica_xxxx"

    // ── Store hashed key ──
    const { error: insertError } = await supabase.from("api_keys").insert({
      name: name.slice(0, 100),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      owner_email: email,
      owner_name: companyName ? name : name,
      company_name: companyName,
      tier: "free",
      rate_limit_per_minute: 30,
      rate_limit_per_day: 1000,
      is_active: true,
      requests_today: 0,
      requests_total: 0,
    });

    if (insertError) {
      log.error("Failed to insert API key", { error: insertError.message });
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500, headers: API_CORS_HEADERS },
      );
    }

    log.info("API key created", {
      prefix: keyPrefix,
      email,
      company: companyName,
    });

    // ── Send confirmation email ──
    const safeName = escapeHtml(name);
    const safePrefix = escapeHtml(keyPrefix);
    const safeCompany = companyName ? escapeHtml(companyName) : null;

    sendEmail({
      to: email,
      subject: "Your Invest.com.au API Key",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #334155;">
          <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px;">Invest.com.au API</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 15px; margin-top: 0;">Hi${safeCompany ? ` (${safeCompany})` : ""},</p>
            <p style="font-size: 15px;">Your API key <strong>${safeName}</strong> (${safePrefix}...) has been created.</p>
            <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
              <p style="font-size: 13px; color: #92400e; margin: 0;"><strong>Important:</strong> Save your API key securely. It was shown once at creation and cannot be retrieved again.</p>
            </div>
            <p style="font-size: 14px;"><strong>Tier:</strong> Free</p>
            <p style="font-size: 14px;"><strong>Rate limits:</strong> 30 requests/minute, 1,000 requests/day</p>
            <p style="font-size: 14px;"><strong>Documentation:</strong> <a href="https://invest.com.au/api-docs" style="color: #2563eb;">invest.com.au/api-docs</a></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 12px; color: #94a3b8;">Need a higher rate limit? Contact us at <a href="mailto:api@invest.com.au" style="color: #64748b;">api@invest.com.au</a></p>
          </div>
        </div>
      `,
    });

    const elapsed = Date.now() - start;
    log.info("API key creation completed", {
      prefix: keyPrefix,
      elapsedMs: elapsed,
    });

    return NextResponse.json(
      {
        api_key: plainKey,
        key_prefix: keyPrefix,
        tier: "free",
        rate_limits: {
          per_minute: 30,
          per_day: 1000,
        },
        message:
          "Save this API key securely. It will not be shown again.",
      },
      { status: 201, headers: API_CORS_HEADERS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unexpected error creating API key", { error: msg });
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }
}

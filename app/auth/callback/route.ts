import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("auth-callback");

/**
 * Magic-link / email OTP callback. Supabase redirects here after the
 * user clicks an email verification link. Depending on the project's
 * email template, email provider scanner, and the flow the client was
 * configured to use, the incoming request can take any of three shapes:
 *
 *   1. PKCE flow (default for @supabase/ssr):
 *        ?code=<auth_code>
 *      Needs supabase.auth.exchangeCodeForSession(code), which reads
 *      the sb-<project>-auth-token-code-verifier cookie set when the
 *      user requested the link. Cross-device clicks fail this path
 *      because the cookie isn't on the opening browser.
 *
 *   2. OTP / token_hash flow:
 *        ?token_hash=<hash>&type=(magiclink|signup|recovery|email_change|invite)
 *      Needs supabase.auth.verifyOtp({ type, token_hash }). This path
 *      is cross-device safe because it doesn't depend on a browser
 *      cookie — the token is verified server-side only. It's the
 *      recommended flow for email OTPs.
 *
 *   3. Error response:
 *        ?error=<code>&error_description=<human-readable>
 *      Supabase returns this when the verify endpoint rejected the
 *      token (expired, already used by Gmail's link scanner, wrong
 *      redirect URL, etc).
 *
 * Previously this route only handled #1 and quietly redirected every
 * other case to /auth/login?error=callback_failed, which made every
 * failure mode indistinguishable from the user's perspective and hid
 * actionable diagnostics. Now all three are handled with explicit
 * error surfacing so users see a real message and a resend option.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  const nextRaw = searchParams.get("next") ?? "/account";
  // Prevent open redirect — only same-origin relative paths.
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/account";

  // ─── Case 3: Supabase rejected the token ───────────────────────
  if (errorParam) {
    log.warn("Auth callback received error from Supabase", {
      error: errorParam,
      errorCode,
      description: errorDescription,
    });
    // access_denied + otp_expired is the "Gmail link scanner consumed
    // the token" / "user waited too long" combo. Surface it explicitly.
    const reason = errorCode || errorParam;
    return NextResponse.redirect(
      buildErrorUrl(origin, reason, errorDescription, next),
    );
  }

  const supabase = await createClient();

  // ─── Case 1: PKCE flow — ?code=… ──────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    log.warn("exchangeCodeForSession failed", {
      error: error.message,
      status: error.status,
    });
    // PKCE failures are almost always one of:
    //  - "invalid flow state" = code_verifier cookie missing (cross-
    //    device, cleared cookies, or Gmail prefetch consumed the token)
    //  - "code expired" = waited too long before clicking
    return NextResponse.redirect(
      buildErrorUrl(origin, "pkce_failed", error.message, next),
    );
  }

  // ─── Case 2: OTP / token_hash flow ────────────────────────────
  if (tokenHash && type) {
    // Supabase type values: 'signup' | 'magiclink' | 'recovery' |
    // 'email_change' | 'invite' | 'email'. We pass through whatever
    // the email template provided.
    const otpType = type as "signup" | "magiclink" | "recovery" | "email_change" | "invite" | "email";
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    log.warn("verifyOtp failed", {
      error: error.message,
      status: error.status,
      type,
    });
    return NextResponse.redirect(
      buildErrorUrl(origin, "otp_failed", error.message, next),
    );
  }

  // ─── Fall-through: nothing recognisable in the query string ──
  // Usually means a direct hit on /auth/callback without Supabase
  // having redirected here, or a malformed email template.
  log.warn("Auth callback called without code or token_hash", {
    params: Object.fromEntries(searchParams.entries()),
  });
  return NextResponse.redirect(
    buildErrorUrl(origin, "missing_params", null, next),
  );
}

function buildErrorUrl(
  origin: string,
  reason: string,
  description: string | null,
  next: string,
): URL {
  const url = new URL("/auth/auth-error", origin);
  url.searchParams.set("reason", reason);
  if (description) url.searchParams.set("desc", description.slice(0, 200));
  url.searchParams.set("next", next);
  return url;
}

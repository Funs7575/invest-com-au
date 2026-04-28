import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import {
  isAdminMfaEnrolled,
  verifyAdminMfaCode,
  verifyAdminRecoveryCode,
} from "@/lib/admin-mfa";
import {
  signMfaCookie,
  MFA_COOKIE_NAME,
  MFA_COOKIE_MAX_AGE_S,
} from "@/lib/admin-mfa-cookie";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/mfa/verify
 *
 * Step-up MFA verification for an already-authenticated admin. The
 * admin must have a valid Supabase session (enforced by
 * `requireAdmin()`); they then submit either a 6-digit TOTP code or
 * a one-shot recovery code. On success this route sets the
 * `admin_mfa_verified` HMAC-signed cookie that proxy.ts reads for
 * /admin/** access. The cookie lasts 12 hours.
 *
 * Body: `{ code: string }` (6-digit TOTP) OR `{ recovery_code: string }`.
 *
 * Status codes:
 *   200 — verification ok, cookie set
 *   400 — missing both code and recovery_code
 *   401 — not authenticated as admin
 *   403 — admin not enrolled (must enroll before verifying)
 *   422 — code/recovery_code wrong
 */

const log = logger("admin:mfa:verify");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const adminEmail = guard.email;

  let body: { code?: string; recovery_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const recoveryCode =
    typeof body.recovery_code === "string" ? body.recovery_code.trim() : "";

  if (!code && !recoveryCode) {
    return NextResponse.json(
      { error: "code or recovery_code required" },
      { status: 400 },
    );
  }

  const enrolled = await isAdminMfaEnrolled(adminEmail);
  if (!enrolled) {
    return NextResponse.json(
      {
        error:
          "MFA not enrolled. Enroll at /admin/settings/mfa before verifying.",
        code: "not_enrolled",
      },
      { status: 403 },
    );
  }

  const verdict = recoveryCode
    ? await verifyAdminRecoveryCode(adminEmail, recoveryCode)
    : await verifyAdminMfaCode(adminEmail, code);

  if (verdict !== "ok") {
    log.warn("MFA verify failed", { adminEmail, verdict });
    const message =
      verdict === "bad_code"
        ? "Invalid code"
        : verdict === "disabled"
          ? "MFA is disabled for this account"
          : verdict === "not_enrolled"
            ? "MFA not enrolled"
            : "Verification failed";
    return NextResponse.json(
      { error: message, code: verdict },
      { status: verdict === "bad_code" ? 422 : 403 },
    );
  }

  const cookieValue = signMfaCookie(adminEmail);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: MFA_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MFA_COOKIE_MAX_AGE_S,
  });
  log.info("MFA verified", { adminEmail, via: recoveryCode ? "recovery" : "totp" });
  return response;
}

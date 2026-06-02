import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import {
  enrollAdminMfa,
  isAdminMfaEnrolled,
  disableAdminMfa,
} from "@/lib/admin-mfa";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminMfaEnv } from "@/lib/admin-mfa-env-check";
import { logger } from "@/lib/logger";

const log = logger("admin:mfa:enroll");

// Friendlier first-time-setup gate: instead of letting the deep
// "ADMIN_MFA_KEY env var is required for MFA encryption" error from
// lib/mfa-totp.ts surface as a 500 mid-enrollment, return a clean
// 503 with the full list of missing vars up-front. Saves the stutter
// of "set var → redeploy → fail on next var → set var → redeploy".
function envGate(): NextResponse | null {
  const status = checkAdminMfaEnv();
  if (status.ok) return null;
  return NextResponse.json(
    {
      error: "Admin MFA is not configured. Set the missing env vars in Vercel and redeploy.",
      missing: status.missing,
      docs: "/docs/ops/admin-mfa-rollout.md",
    },
    { status: 503 },
  );
}

export const runtime = "nodejs";

/**
 * GET   — returns whether the current admin has MFA enrolled.
 * POST  — generates a fresh TOTP secret + recovery codes.
 *         Returns them ONCE. The caller must show the QR and
 *         the recovery codes immediately — there is no way to
 *         retrieve them again.
 * DELETE — disables MFA for the current admin. Records an audit
 *          row and requires a reason.
 */

export async function GET() {
  const guard = await requireAdmin({ requireMfa: false }); // enroll establishes MFA — never gate it on the MFA cookie
  if (!guard.ok) return guard.response;
  const enrolled = await isAdminMfaEnrolled(guard.email);
  return NextResponse.json({ enrolled, email: guard.email });
}

export async function POST() {
  const envProblem = envGate();
  if (envProblem) return envProblem;

  const guard = await requireAdmin({ requireMfa: false }); // enroll establishes MFA — never gate it on the MFA cookie
  if (!guard.ok) return guard.response;

  try {
    const result = await enrollAdminMfa(guard.email);

    // Audit row
    const supabase = createAdminClient();
    await supabase.from("admin_action_log").insert({
      admin_email: guard.email,
      feature: "admin_mfa",
      action: "config",
      reason: "mfa_enrolled",
      context: { email: guard.email },
    });

    log.info("Admin MFA enrolled", { email: guard.email });
    return NextResponse.json({
      ok: true,
      secret: result.secret,
      otpAuthUrl: result.otpAuthUrl,
      recoveryCodes: result.recoveryCodes,
      warning:
        "These codes are shown only once. Save them somewhere safe. If you lose them and your authenticator, you will need an admin to re-provision.",
    });
  } catch (err) {
    log.error("MFA enrollment failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "enroll_failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requireAdmin({ requireMfa: false }); // enroll establishes MFA — never gate it on the MFA cookie
  if (!guard.ok) return guard.response;

  // eslint-disable-next-line invest/no-unvalidated-req-json -- single optional field; below check is the contract.
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : null;
  if (!reason || reason.length < 5) {
    return NextResponse.json(
      { error: "A reason is required to disable MFA" },
      { status: 400 },
    );
  }

  await disableAdminMfa(guard.email);

  const supabase = createAdminClient();
  await supabase.from("admin_action_log").insert({
    admin_email: guard.email,
    feature: "admin_mfa",
    action: "config",
    reason: "mfa_disabled",
    context: { reason },
  });
  log.warn("Admin MFA disabled", { email: guard.email, reason });

  return NextResponse.json({ ok: true });
}

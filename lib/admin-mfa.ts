/**
 * Admin MFA storage + verification flow.
 *
 * Glues `lib/mfa-totp.ts` (pure crypto) with Supabase. Exposes:
 *
 *   - enrollAdminMfa(email)          — generate secret, encrypt,
 *                                      persist, return QR URL + recovery
 *   - isAdminMfaEnrolled(email)      — boolean
 *   - verifyAdminMfaCode(email, c)   — returns 'ok' | 'bad_code' | 'not_enrolled'
 *   - verifyAdminRecoveryCode(email) — one-shot recovery code path
 *   - disableAdminMfa(email)         — soft delete; requires re-enrol
 *
 * All writes go through the admin (service role) Supabase client
 * so RLS stays locked down on the `admin_mfa_enrollments` table.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  generateTotpSecret,
  encryptSecret,
  decryptSecret,
  verifyTotpCode,
  buildOtpAuthUrl,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/mfa-totp";

const log = logger("admin-mfa");

const ISSUER = "Invest.com.au Admin";

export interface MfaEnrolmentResult {
  secret: string; // plaintext — show ONCE during enrolment, never stored
  otpAuthUrl: string; // for QR code rendering on the enrollment page
  recoveryCodes: string[]; // plaintext — show ONCE, never stored
}

export type MfaVerifyResult = "ok" | "bad_code" | "not_enrolled" | "disabled";

/**
 * Create a fresh enrolment row for an admin. If a row already
 * exists (enrolled_at set, disabled_at null) we throw — force the
 * caller to explicitly disable first. This prevents accidental
 * rotation that locks admins out.
 */
export async function enrollAdminMfa(adminEmail: string): Promise<MfaEnrolmentResult> {
  const supabase = createAdminClient();
  const existing = await getRow(supabase, adminEmail);
  if (existing && !existing.disabled_at) {
    throw new Error(
      "Admin already enrolled — disable before re-enrolling",
    );
  }

  const plaintextSecret = generateTotpSecret();
  const encrypted = encryptSecret(plaintextSecret);
  const recoveryCodes = generateRecoveryCodes(10);
  const hashedCodes = recoveryCodes.map(hashRecoveryCode);

  const { error } = await supabase
    .from("admin_mfa_enrollments")
    .upsert(
      {
        admin_email: adminEmail.toLowerCase(),
        secret_encrypted: encrypted,
        recovery_codes: hashedCodes,
        enrolled_at: new Date().toISOString(),
        disabled_at: null,
      },
      { onConflict: "admin_email" },
    );
  if (error) {
    log.error("admin_mfa_enrollments upsert failed", { error: error.message });
    throw new Error(`MFA enrollment failed: ${error.message}`);
  }

  return {
    secret: plaintextSecret,
    otpAuthUrl: buildOtpAuthUrl(ISSUER, adminEmail, plaintextSecret),
    recoveryCodes,
  };
}

/**
 * Returns true if an active enrollment exists for this admin.
 */
export async function isAdminMfaEnrolled(adminEmail: string): Promise<boolean> {
  const supabase = createAdminClient();
  const row = await getRow(supabase, adminEmail);
  return !!row && !row.disabled_at;
}

/**
 * Verify a TOTP code for an admin. Returns:
 *   'ok'            — code matches, last_verified_at stamped
 *   'bad_code'      — valid enrollment but code wrong or stale
 *   'not_enrolled'  — no row
 *   'disabled'      — row exists but disabled_at is set
 */
export async function verifyAdminMfaCode(
  adminEmail: string,
  submittedCode: string,
): Promise<MfaVerifyResult> {
  const supabase = createAdminClient();
  const row = await getRow(supabase, adminEmail);
  if (!row) return "not_enrolled";
  if (row.disabled_at) return "disabled";

  let plaintext: string;
  try {
    plaintext = decryptSecret(row.secret_encrypted);
  } catch (err) {
    log.error("admin MFA decrypt failed", {
      adminEmail,
      err: err instanceof Error ? err.message : String(err),
    });
    return "bad_code";
  }

  if (!verifyTotpCode(plaintext, submittedCode)) return "bad_code";

  await supabase
    .from("admin_mfa_enrollments")
    .update({ last_verified_at: new Date().toISOString() })
    .eq("admin_email", adminEmail.toLowerCase());
  return "ok";
}

/**
 * One-shot recovery-code login. Removes the used code from the
 * row so it can't be replayed. Returns same verdict set as
 * verifyAdminMfaCode.
 */
export async function verifyAdminRecoveryCode(
  adminEmail: string,
  suppliedCode: string,
): Promise<MfaVerifyResult> {
  const supabase = createAdminClient();
  const row = await getRow(supabase, adminEmail);
  if (!row) return "not_enrolled";
  if (row.disabled_at) return "disabled";

  const idx = verifyRecoveryCode(suppliedCode, row.recovery_codes);
  if (idx < 0) return "bad_code";

  // Remove the used code
  const remaining = [...row.recovery_codes];
  remaining.splice(idx, 1);
  await supabase
    .from("admin_mfa_enrollments")
    .update({
      recovery_codes: remaining,
      last_verified_at: new Date().toISOString(),
    })
    .eq("admin_email", adminEmail.toLowerCase());
  log.warn("admin used recovery code", {
    adminEmail,
    remaining: remaining.length,
  });
  return "ok";
}

export async function disableAdminMfa(adminEmail: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("admin_mfa_enrollments")
    .update({ disabled_at: new Date().toISOString() })
    .eq("admin_email", adminEmail.toLowerCase());
}

// ─── internals ────────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>;

interface EnrollmentRow {
  admin_email: string;
  secret_encrypted: string;
  recovery_codes: string[];
  enrolled_at: string;
  last_verified_at: string | null;
  disabled_at: string | null;
}

async function getRow(
  supabase: AdminClient,
  adminEmail: string,
): Promise<EnrollmentRow | null> {
  const { data } = await supabase
    .from("admin_mfa_enrollments")
    .select(
      "admin_email, secret_encrypted, recovery_codes, enrolled_at, last_verified_at, disabled_at",
    )
    .eq("admin_email", adminEmail.toLowerCase())
    .maybeSingle();
  return (data as EnrollmentRow | null) || null;
}

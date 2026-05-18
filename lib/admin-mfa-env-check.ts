import { logger } from "@/lib/logger";

const log = logger("admin-mfa-env-check");

// One-shot env-var integrity check for the admin-MFA stack. Called by the
// MFA verify + enroll routes on each request — pays a single Set.has()
// per request and never blocks the request (it logs + returns a status,
// it doesn't throw). The actual enforcement happens at the call-site in
// `lib/mfa-totp.ts` and the proxy gate; this function exists to surface
// "you forgot a var" early and explicitly in logs / dashboards.
//
// Two-var minimum: ADMIN_MFA_COOKIE_SECRET (cookie HMAC) +
// ADMIN_MFA_KEY (TOTP encryption). The third var,
// ADMIN_MFA_RECOVERY_PEPPER, is optional and defaults to a constant.
//
// The check has been deduped via a module-level `Set` so we don't spam
// logs on every request — once warned per process, stay quiet.

const warned = new Set<string>();

export interface AdminMfaEnvStatus {
  ok: boolean;
  missing: string[];
}

export function checkAdminMfaEnv(): AdminMfaEnvStatus {
  const missing: string[] = [];
  if (!process.env.ADMIN_MFA_COOKIE_SECRET) missing.push("ADMIN_MFA_COOKIE_SECRET");
  if (!process.env.ADMIN_MFA_KEY) missing.push("ADMIN_MFA_KEY");

  if (missing.length > 0) {
    const key = missing.join(",");
    if (!warned.has(key)) {
      warned.add(key);
      log.error(
        "admin MFA env vars missing — admin login will fail. See docs/ops/admin-mfa-rollout.md",
        { missing },
      );
    }
    return { ok: false, missing };
  }

  return { ok: true, missing: [] };
}

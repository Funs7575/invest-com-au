/**
 * Shared admin constants — single source of truth for admin email list
 * and fallback avatar generation.
 *
 * Import this instead of re-declaring ADMIN_EMAILS in every API route.
 *
 * Use getAdminEmails() / getAdminEmail() in code that needs to respect
 * test-time env overrides. The plain ADMIN_EMAILS / ADMIN_EMAIL constants
 * are kept for backward-compat but read env at import time.
 */

/** Admin email addresses — reads env at call time (test-friendly) */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "admin@invest.com.au,finnduns@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase());
}

/** Backward-compatible constant */
export const ADMIN_EMAILS = getAdminEmails();

/** Primary admin email — reads env at call time (test-friendly) */
export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || "admin@invest.com.au";
}

/** Backward-compatible constant */
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "admin@invest.com.au";

/** Brand purple used for ui-avatars.com fallback backgrounds */
const AVATAR_BG = "7c3aed";

/**
 * Generate a consistent fallback avatar URL for a given name.
 */
export function fallbackAvatarUrl(
  name: string,
  size: number = 80,
): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=${AVATAR_BG}&color=fff`;
}

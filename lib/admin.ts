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
  return (process.env.ADMIN_EMAILS || "admin@invest.com.au")
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

/**
 * Fin-objection email allowlist — specifically who can stamp
 * editorial_articles.fin_objection_at via the admin route.
 *
 * Narrower than getAdminEmails(). Per .claude/agents/04-editorial.md,
 * fin_objection_at is Fin's exclusive surface — admin ≠ Fin. Adding
 * Co-Founder here at Step 11 onboarding is a deliberate decision
 * (see TODO.md), not automatic.
 *
 * Resolution order: FIN_OBJECTION_EMAILS → FIN_EMAIL → hardcoded default.
 */
export function getFinObjectionEmails(): string[] {
  const source =
    process.env.FIN_OBJECTION_EMAILS ||
    process.env.FIN_EMAIL ||
    "ops@invest.com.au";
  return source
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

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

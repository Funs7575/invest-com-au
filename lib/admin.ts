/**
 * Shared admin constants — single source of truth for admin email list
 * and fallback avatar generation.
 *
 * Import this instead of re-declaring ADMIN_EMAILS in every API route.
 */

/** Admin email addresses parsed from environment variable */
export const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS || "admin@invest.com.au"
)
  .split(",")
  .map((e) => e.trim().toLowerCase());

/** Primary admin email for transactional notifications */
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "admin@invest.com.au";

/** Brand purple used for ui-avatars.com fallback backgrounds */
const AVATAR_BG = "7c3aed";

/**
 * Generate a consistent fallback avatar URL for a given name.
 * Use this everywhere instead of ad-hoc ui-avatars.com strings
 * so the background colour is always consistent.
 */
export function fallbackAvatarUrl(
  name: string,
  size: number = 80,
): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=${AVATAR_BG}&color=fff`;
}

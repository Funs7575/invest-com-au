/**
 * Open-redirect guard for post-auth `next` redirect params.
 *
 * Only same-origin relative paths are allowed. Absolute URLs
 * (`https://evil.example/x`), protocol-relative URLs (`//evil.example/x`),
 * and any non-`/`-leading value fall back to a safe default.
 *
 * Mirrors the inline guard already used in app/auth/callback/route.ts and
 * app/auth/auth-error/page.tsx — kept here as the single source of truth.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/account"
): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

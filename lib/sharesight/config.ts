/**
 * Sharesight OAuth + API configuration (PR-X5g / W2.11).
 *
 * Sharesight's OAuth2 app is registered by the founder out-of-band — once
 * the app is approved we drop client id + secret in env. Until then this
 * module exposes `isConfigured()` so the UI can show a "Coming soon" state
 * and the API routes can 503 cleanly instead of throwing on undefined env.
 *
 * Required env vars (set in Vercel project settings, NOT in .env files
 * checked in to git):
 *
 *   SHARESIGHT_CLIENT_ID         — OAuth2 client id from Sharesight app
 *   SHARESIGHT_CLIENT_SECRET     — OAuth2 client secret
 *   SHARESIGHT_API_BASE_URL      — e.g. "https://api.sharesight.com.au"
 *                                  (regional — .au for AU users, .com for global)
 *   SHARESIGHT_OAUTH_STATE_SECRET — random 32+ byte secret for HMAC-signing
 *                                  the OAuth state parameter (CSRF guard)
 *   NEXT_PUBLIC_SITE_URL         — site origin (already configured) — used
 *                                  to build the OAuth redirect_uri
 */

export interface SharesightConfig {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  stateSecret: string;
  redirectUri: string;
}

const DEFAULT_API_BASE = "https://api.sharesight.com.au";

function siteOrigin(): string {
  // NEXT_PUBLIC_SITE_URL is set in CI + Vercel. Fall back to localhost so
  // unit tests don't blow up when the var is absent.
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/**
 * Returns the resolved config when every required env var is present,
 * otherwise `null` so callers can render a "not configured" surface
 * without trying/catching missing-var errors.
 */
export function getSharesightConfig(): SharesightConfig | null {
  const clientId = process.env.SHARESIGHT_CLIENT_ID?.trim();
  const clientSecret = process.env.SHARESIGHT_CLIENT_SECRET?.trim();
  const stateSecret = process.env.SHARESIGHT_OAUTH_STATE_SECRET?.trim();
  if (!clientId || !clientSecret || !stateSecret) return null;

  const apiBaseUrl =
    process.env.SHARESIGHT_API_BASE_URL?.trim().replace(/\/$/, "") ||
    DEFAULT_API_BASE;

  return {
    clientId,
    clientSecret,
    apiBaseUrl,
    stateSecret,
    redirectUri: `${siteOrigin()}/api/account/sharesight/callback`,
  };
}

/** Cheap probe — used by the UI before showing the connect button. */
export function isSharesightConfigured(): boolean {
  return getSharesightConfig() !== null;
}

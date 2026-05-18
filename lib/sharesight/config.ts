/**
 * Sharesight OAuth + API configuration.
 *
 * Sharesight runs an OAuth-2.0 authorization-code flow. To activate the
 * integration in production, set the three env vars below; if any is
 * missing, `getSharesightConfig()` throws and the connect/sync routes
 * respond 503 (`sharesight_not_configured`) rather than crashing.
 *
 *   SHARESIGHT_CLIENT_ID         — OAuth client id (Sharesight dashboard)
 *   SHARESIGHT_CLIENT_SECRET     — OAuth client secret (Sharesight dashboard)
 *   INVESTOR_OAUTH_KEY           — 32-byte hex/base64; AES-256-GCM key
 *                                   wrapping the stored access/refresh
 *                                   tokens at rest. Rotate by re-issuing
 *                                   user connections (each user
 *                                   re-authorises).
 *
 * Redirect URI is derived from `NEXT_PUBLIC_SITE_URL` so the same code
 * path works in dev/preview/prod without an extra env var per
 * environment. Register that URL in the Sharesight dashboard.
 *
 * Endpoint hosts: `https://api.sharesight.com` for OAuth + REST.
 * Scopes requested: `read_portfolios` (the minimum that lets us call
 * /api/v2/portfolios.json + the holdings sub-resource).
 */
export interface SharesightConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBase: string;
  authBase: string;
  scope: string;
}

export const SHARESIGHT_API_BASE = "https://api.sharesight.com/api/v2";
export const SHARESIGHT_AUTH_BASE = "https://api.sharesight.com/oauth2";
export const SHARESIGHT_SCOPE = "read_portfolios";

export function getSharesightConfig(): SharesightConfig {
  const clientId = process.env.SHARESIGHT_CLIENT_ID ?? "";
  const clientSecret = process.env.SHARESIGHT_CLIENT_SECRET ?? "";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    "";
  if (!clientId || !clientSecret) {
    throw new Error("sharesight_not_configured");
  }
  if (!siteUrl) {
    throw new Error("sharesight_redirect_uri_unresolved");
  }
  const origin = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  return {
    clientId,
    clientSecret,
    redirectUri: `${origin}/api/account/holdings/sharesight/callback`,
    apiBase: SHARESIGHT_API_BASE,
    authBase: SHARESIGHT_AUTH_BASE,
    scope: SHARESIGHT_SCOPE,
  };
}

export function isSharesightConfigured(): boolean {
  return Boolean(process.env.SHARESIGHT_CLIENT_ID && process.env.SHARESIGHT_CLIENT_SECRET);
}

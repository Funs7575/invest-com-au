/**
 * Sharesight OAuth 2.0 client.
 *
 * Sharesight (~50k+ AU users — dominant local portfolio tracker) exposes a
 * standard OAuth2 authorization-code flow at https://api.sharesight.com.
 * This module isolates the four primitives so the route handlers stay thin:
 *
 *   - getSharesightConfig()       — env-driven config; returns null when the
 *                                   integration is unconfigured (so the UI
 *                                   can hide the entry point gracefully
 *                                   instead of 500-ing).
 *   - buildAuthorizeUrl({ state })— the redirect target for "Connect".
 *   - exchangeCodeForToken(code)  — code → access + refresh.
 *   - refreshAccessToken(refresh) — refresh → fresh access.
 *
 * Network calls are isolated to two functions (`exchangeCodeForToken` +
 * `refreshAccessToken`) so they can be stubbed in tests without mocking
 * the whole module.
 *
 * Per Sharesight's docs the access token TTL is 7200s; we treat anything
 * within 60s of expiry as expired (refresh-on-read) to absorb clock skew.
 */
import { logger } from "@/lib/logger";

const log = logger("sharesight:oauth");

const DEFAULT_BASE_URL = "https://api.sharesight.com";

export interface SharesightConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
  scope: string;
}

export interface SharesightTokenResponse {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
  token_type: string;
  scope: string | null;
}

/**
 * Returns the Sharesight config from env, or null if any required env var
 * is missing. Callers should treat null as "feature disabled" — not an
 * error — so the integration can ship without env wiring in place.
 */
export function getSharesightConfig(): SharesightConfig | null {
  const clientId = process.env.SHARESIGHT_CLIENT_ID;
  const clientSecret = process.env.SHARESIGHT_CLIENT_SECRET;
  const redirectUri = process.env.SHARESIGHT_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    baseUrl: process.env.SHARESIGHT_BASE_URL || DEFAULT_BASE_URL,
    scope: process.env.SHARESIGHT_SCOPE || "user_data",
  };
}

export function buildAuthorizeUrl(
  config: SharesightConfig,
  state: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
  });
  return `${config.baseUrl}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  config: SharesightConfig,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SharesightTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  const res = await fetchImpl(`${config.baseUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn("sharesight token exchange failed", { status: res.status });
    throw new SharesightOAuthError(
      `Sharesight token exchange failed (${res.status})`,
      res.status,
      text.slice(0, 500),
    );
  }
  const json = (await res.json()) as Partial<SharesightTokenResponse>;
  return assertTokenResponse(json);
}

export async function refreshAccessToken(
  config: SharesightConfig,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SharesightTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  const res = await fetchImpl(`${config.baseUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn("sharesight token refresh failed", { status: res.status });
    throw new SharesightOAuthError(
      `Sharesight token refresh failed (${res.status})`,
      res.status,
      text.slice(0, 500),
    );
  }
  const json = (await res.json()) as Partial<SharesightTokenResponse>;
  return assertTokenResponse(json);
}

/**
 * Computes when a token expires given Sharesight's `expires_in` (seconds).
 * Subtracts a 60s skew buffer so the refresh-on-read check fires slightly
 * before the actual expiry.
 */
export function computeExpiresAt(
  expiresIn: number,
  nowMs: number = Date.now(),
): string {
  const skewMs = 60_000;
  return new Date(nowMs + expiresIn * 1000 - skewMs).toISOString();
}

export function isTokenExpired(
  expiresAtIso: string,
  nowMs: number = Date.now(),
): boolean {
  const t = Date.parse(expiresAtIso);
  if (!Number.isFinite(t)) return true;
  return t <= nowMs;
}

export class SharesightOAuthError extends Error {
  readonly status: number;
  readonly responseSnippet: string;
  constructor(message: string, status: number, responseSnippet: string) {
    super(message);
    this.name = "SharesightOAuthError";
    this.status = status;
    this.responseSnippet = responseSnippet;
  }
}

function assertTokenResponse(
  json: Partial<SharesightTokenResponse>,
): SharesightTokenResponse {
  if (typeof json.access_token !== "string" || json.access_token.length === 0) {
    throw new SharesightOAuthError(
      "Sharesight response missing access_token",
      0,
      JSON.stringify(json).slice(0, 200),
    );
  }
  if (typeof json.expires_in !== "number" || json.expires_in <= 0) {
    throw new SharesightOAuthError(
      "Sharesight response missing or invalid expires_in",
      0,
      JSON.stringify(json).slice(0, 200),
    );
  }
  return {
    access_token: json.access_token,
    refresh_token:
      typeof json.refresh_token === "string" ? json.refresh_token : null,
    expires_in: json.expires_in,
    token_type: typeof json.token_type === "string" ? json.token_type : "Bearer",
    scope: typeof json.scope === "string" ? json.scope : null,
  };
}

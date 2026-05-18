/**
 * Sharesight OAuth + holdings client.
 *
 * Pure-ish — every network call goes through `fetch`. Tests inject a
 * mock fetch via the optional `fetchImpl` param. No DB / no
 * `next/headers` so this module is safe to import from any layer.
 *
 * Endpoints used (Sharesight v2 REST):
 *   POST  ${authBase}/token                          — code exchange + refresh
 *   GET   ${apiBase}/portfolios.json                 — list user portfolios
 *   GET   ${apiBase}/portfolios/<id>/holdings.json   — aggregate holdings
 */
import type { SharesightConfig } from "./config";
import type { SharesightHolding } from "./mapping";

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

export interface SharesightPortfolio {
  id: number | string;
  name: string;
}

export type FetchImpl = typeof fetch;

export function buildAuthorizeUrl(config: SharesightConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
  });
  return `${config.authBase}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  config: SharesightConfig,
  code: string,
  fetchImpl: FetchImpl = fetch,
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });
  const res = await fetchImpl(`${config.authBase}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`sharesight_token_exchange_failed:${res.status}:${detail}`);
  }
  return (await res.json()) as OAuthTokenResponse;
}

export async function refreshAccessToken(
  config: SharesightConfig,
  refreshToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  const res = await fetchImpl(`${config.authBase}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`sharesight_token_refresh_failed:${res.status}:${detail}`);
  }
  return (await res.json()) as OAuthTokenResponse;
}

export async function fetchPortfolios(
  config: SharesightConfig,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<SharesightPortfolio[]> {
  const res = await fetchImpl(`${config.apiBase}/portfolios.json`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`sharesight_portfolios_failed:${res.status}:${detail}`);
  }
  const data = (await res.json()) as { portfolios?: SharesightPortfolio[] };
  return data.portfolios ?? [];
}

export async function fetchHoldings(
  config: SharesightConfig,
  accessToken: string,
  portfolioId: number | string,
  fetchImpl: FetchImpl = fetch,
): Promise<SharesightHolding[]> {
  const res = await fetchImpl(
    `${config.apiBase}/portfolios/${encodeURIComponent(String(portfolioId))}/holdings.json`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`sharesight_holdings_failed:${res.status}:${detail}`);
  }
  const data = (await res.json()) as { holdings?: SharesightHolding[] };
  return data.holdings ?? [];
}

async function safeReadText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 200);
  } catch {
    return "";
  }
}

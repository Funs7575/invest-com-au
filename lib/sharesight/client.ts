/**
 * Sharesight OAuth2 + read-only API client (W2.11 / X5g).
 *
 * Sharesight is a third-party AU portfolio tracker. Their OAuth2 flow is a
 * standard authorization-code grant with refresh-token rotation; the API
 * is straight REST/JSON. Docs (private — engineering reference):
 *
 *   - /oauth2/authorize  — consent screen redirect target
 *   - /oauth2/token      — token exchange + refresh
 *   - /api/v3/portfolios — list portfolios for the connected user
 *   - /api/v3/portfolios/:id/holdings — holdings within a portfolio
 *
 * The client is pure-ish: every network call goes through `fetch`, takes
 * the resolved `SharesightConfig` (or just the API base + access token)
 * explicitly, and returns parsed JSON. There is no module-level state.
 * That makes the surface unit-testable by stubbing `globalThis.fetch`.
 */

import { z } from "zod";
import type { SharesightConfig } from "./config";

/**
 * Token exchange / refresh response. We accept extra fields (Sharesight
 * may add new ones over time) but strictly validate the ones we use.
 */
const TokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
});
export type SharesightTokenResponse = z.infer<typeof TokenResponse>;

/**
 * Subset of the Sharesight holdings payload we care about for import.
 * Sharesight returns many more fields per holding (market value, unrealised
 * gain, etc.); we only persist what `investor_holdings` accepts.
 */
const HoldingPayload = z.object({
  id: z.union([z.number(), z.string()]),
  instrument_code: z.string().min(1).max(30),
  market_code: z.string().min(1).max(20),
  quantity: z.number().positive(),
  /** Average cost per share in the portfolio currency (decimal). */
  cost_basis: z.number().nonnegative().optional(),
  /** ISO date YYYY-MM-DD of first acquisition. Optional in Sharesight's
   *  payload — when missing we fall back to today so the row passes our
   *  NOT NULL constraint. */
  first_purchase_date: z.string().optional(),
});
export type SharesightHolding = z.infer<typeof HoldingPayload>;

const HoldingsListResponse = z.object({
  holdings: z.array(HoldingPayload),
});

const PortfolioPayload = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
});
const PortfoliosListResponse = z.object({
  portfolios: z.array(PortfolioPayload),
});

const FETCH_TIMEOUT_MS = 15_000;

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `sharesight ${init.method ?? "GET"} ${url} → ${res.status} ${body.slice(0, 200)}`,
      );
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Build the OAuth2 authorize URL the user is redirected to so they can
 * approve our app on Sharesight's domain.
 */
export function buildAuthorizeUrl(
  config: SharesightConfig,
  state: string,
  scope = "read_portfolio",
): string {
  const u = new URL(`${config.apiBaseUrl}/oauth2/authorize`);
  u.searchParams.set("client_id", config.clientId);
  u.searchParams.set("redirect_uri", config.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", scope);
  u.searchParams.set("state", state);
  return u.toString();
}

/** Exchange an authorization code for access + refresh tokens. */
export async function exchangeCodeForTokens(
  config: SharesightConfig,
  code: string,
): Promise<SharesightTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });
  const raw = await fetchJson(`${config.apiBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return TokenResponse.parse(raw);
}

/** Use a refresh token to mint a fresh access token + refresh token. */
export async function refreshAccessToken(
  config: SharesightConfig,
  refreshToken: string,
): Promise<SharesightTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  const raw = await fetchJson(`${config.apiBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return TokenResponse.parse(raw);
}

export interface SharesightConnectionState {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAtS: number;
  apiBaseUrl: string;
}

/**
 * Refresh the access token in place if within 60s of expiry. Returns the
 * (possibly updated) connection state so callers can persist any change.
 */
export async function ensureFreshAccessToken(
  config: SharesightConfig,
  state: SharesightConnectionState,
  nowMs = Date.now(),
): Promise<SharesightConnectionState> {
  const nowS = Math.floor(nowMs / 1000);
  if (state.expiresAtS - nowS > 60) return state;
  const refreshed = await refreshAccessToken(config, state.refreshToken);
  return {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAtS: nowS + refreshed.expires_in,
    apiBaseUrl: state.apiBaseUrl,
  };
}

/** List all portfolios the connected user has access to. */
export async function listPortfolios(
  state: SharesightConnectionState,
): Promise<Array<{ id: string; name: string }>> {
  const raw = await fetchJson(`${state.apiBaseUrl}/api/v3/portfolios`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
      Accept: "application/json",
    },
  });
  const parsed = PortfoliosListResponse.parse(raw);
  return parsed.portfolios.map((p) => ({ id: String(p.id), name: p.name }));
}

/** List holdings within a portfolio. */
export async function listHoldings(
  state: SharesightConnectionState,
  portfolioId: string,
): Promise<SharesightHolding[]> {
  const raw = await fetchJson(
    `${state.apiBaseUrl}/api/v3/portfolios/${encodeURIComponent(portfolioId)}/holdings`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
        Accept: "application/json",
      },
    },
  );
  return HoldingsListResponse.parse(raw).holdings;
}

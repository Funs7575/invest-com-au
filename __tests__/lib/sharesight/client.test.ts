import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  ensureFreshAccessToken,
  listPortfolios,
  listHoldings,
  type SharesightConnectionState,
} from "@/lib/sharesight/client";
import type { SharesightConfig } from "@/lib/sharesight/config";

const CONFIG: SharesightConfig = {
  clientId: "client123",
  clientSecret: "secret456",
  apiBaseUrl: "https://api.sharesight.com.au",
  stateSecret: "state",
  redirectUri: "https://invest.com.au/api/account/sharesight/callback",
};

const ORIGINAL_FETCH = globalThis.fetch;

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("buildAuthorizeUrl", () => {
  it("produces a valid authorize URL with required params", () => {
    const url = new URL(buildAuthorizeUrl(CONFIG, "STATE_TOKEN"));
    expect(url.origin + url.pathname).toBe("https://api.sharesight.com.au/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("client123");
    expect(url.searchParams.get("redirect_uri")).toBe(CONFIG.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("STATE_TOKEN");
    expect(url.searchParams.get("scope")).toBe("read_portfolio");
  });
});

describe("exchangeCodeForTokens", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("POSTs form-encoded body to /oauth2/token and parses the response", async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ access_token: "a", refresh_token: "r", expires_in: 3600 }),
    );
    const tokens = await exchangeCodeForTokens(CONFIG, "auth-code-xyz");
    expect(tokens.access_token).toBe("a");
    expect(tokens.refresh_token).toBe("r");
    expect(tokens.expires_in).toBe(3600);

    const [calledUrl, calledInit] = mockFetch.mock.calls[0]!;
    expect(calledUrl).toBe("https://api.sharesight.com.au/oauth2/token");
    expect((calledInit as RequestInit).method).toBe("POST");
    const body = String((calledInit as RequestInit).body);
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=auth-code-xyz");
    expect(body).toContain("client_id=client123");
  });

  it("throws when the response is not 2xx", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockJsonResponse({ error: "invalid_grant" }, 400),
    );
    await expect(exchangeCodeForTokens(CONFIG, "bad")).rejects.toThrow(/400/);
  });

  it("throws when the response is missing required fields", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockJsonResponse({ access_token: "a" }));
    await expect(exchangeCodeForTokens(CONFIG, "code")).rejects.toThrow();
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("sends grant_type=refresh_token and returns new tokens", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockJsonResponse({ access_token: "a2", refresh_token: "r2", expires_in: 1800 }),
    );
    const tokens = await refreshAccessToken(CONFIG, "old-refresh");
    expect(tokens.access_token).toBe("a2");
    const body = String(vi.mocked(globalThis.fetch).mock.calls[0]![1]!.body);
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=old-refresh");
  });
});

describe("ensureFreshAccessToken", () => {
  const baseState: SharesightConnectionState = {
    accessToken: "current",
    refreshToken: "currentR",
    expiresAtS: Math.floor(Date.now() / 1000) + 3600,
    apiBaseUrl: CONFIG.apiBaseUrl,
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("returns state unchanged when token still has >60s left", async () => {
    const result = await ensureFreshAccessToken(CONFIG, baseState);
    expect(result.accessToken).toBe("current");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("refreshes when within 60s of expiry", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockJsonResponse({ access_token: "fresh", refresh_token: "freshR", expires_in: 7200 }),
    );
    const stale: SharesightConnectionState = {
      ...baseState,
      expiresAtS: Math.floor(Date.now() / 1000) + 30,
    };
    const result = await ensureFreshAccessToken(CONFIG, stale);
    expect(result.accessToken).toBe("fresh");
    expect(result.refreshToken).toBe("freshR");
  });
});

describe("listPortfolios + listHoldings", () => {
  const state: SharesightConnectionState = {
    accessToken: "tok",
    refreshToken: "r",
    expiresAtS: Math.floor(Date.now() / 1000) + 3600,
    apiBaseUrl: CONFIG.apiBaseUrl,
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("listPortfolios maps Sharesight portfolios shape", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockJsonResponse({ portfolios: [{ id: 1, name: "Main" }, { id: "2", name: "SMSF" }] }),
    );
    const portfolios = await listPortfolios(state);
    expect(portfolios).toEqual([
      { id: "1", name: "Main" },
      { id: "2", name: "SMSF" },
    ]);
    const [calledUrl, calledInit] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(calledUrl).toBe("https://api.sharesight.com.au/api/v3/portfolios");
    expect((calledInit as RequestInit).headers).toMatchObject({
      Authorization: "Bearer tok",
    });
  });

  it("listHoldings strips unknown fields and parses the shape", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockJsonResponse({
        holdings: [
          {
            id: 9,
            instrument_code: "BHP",
            market_code: "ASX",
            quantity: 100,
            cost_basis: 45.5,
            unrealised_gain: "ignored",
          },
        ],
      }),
    );
    const holdings = await listHoldings(state, "1");
    expect(holdings).toHaveLength(1);
    expect(holdings[0]!.instrument_code).toBe("BHP");
  });
});

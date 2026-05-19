import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildAuthorizeUrl,
  computeExpiresAt,
  exchangeCodeForToken,
  getSharesightConfig,
  isTokenExpired,
  refreshAccessToken,
  SharesightOAuthError,
  type SharesightConfig,
} from "@/lib/sharesight/oauth";

function makeConfig(overrides: Partial<SharesightConfig> = {}): SharesightConfig {
  return {
    clientId: "test-client",
    clientSecret: "test-secret",
    redirectUri: "https://example.com/callback",
    baseUrl: "https://api.sharesight.test",
    scope: "user_data",
    ...overrides,
  };
}

describe("getSharesightConfig", () => {
  beforeEach(() => {
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "");
    vi.stubEnv("SHARESIGHT_REDIRECT_URI", "");
    vi.stubEnv("SHARESIGHT_BASE_URL", "");
    vi.stubEnv("SHARESIGHT_SCOPE", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when any required env var is missing", () => {
    expect(getSharesightConfig()).toBeNull();
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "x");
    expect(getSharesightConfig()).toBeNull();
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "y");
    expect(getSharesightConfig()).toBeNull();
  });

  it("returns full config when all required env vars set", () => {
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "cid");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "csec");
    vi.stubEnv("SHARESIGHT_REDIRECT_URI", "https://example.com/cb");
    const config = getSharesightConfig();
    expect(config?.clientId).toBe("cid");
    expect(config?.clientSecret).toBe("csec");
    expect(config?.redirectUri).toBe("https://example.com/cb");
    expect(config?.baseUrl).toBe("https://api.sharesight.com");
    expect(config?.scope).toBe("user_data");
  });

  it("honours optional base URL + scope env overrides", () => {
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "cid");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "csec");
    vi.stubEnv("SHARESIGHT_REDIRECT_URI", "https://example.com/cb");
    vi.stubEnv("SHARESIGHT_BASE_URL", "https://staging.sharesight.test");
    vi.stubEnv("SHARESIGHT_SCOPE", "custom_scope");
    const config = getSharesightConfig();
    expect(config?.baseUrl).toBe("https://staging.sharesight.test");
    expect(config?.scope).toBe("custom_scope");
  });
});

describe("buildAuthorizeUrl", () => {
  it("builds an OAuth2 authorize URL with state + redirect", () => {
    const url = buildAuthorizeUrl(makeConfig(), "abc123");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://api.sharesight.test/oauth2/authorize",
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("test-client");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://example.com/callback",
    );
    expect(parsed.searchParams.get("scope")).toBe("user_data");
    expect(parsed.searchParams.get("state")).toBe("abc123");
  });
});

describe("computeExpiresAt + isTokenExpired", () => {
  it("subtracts a 60s skew buffer from the absolute expiry", () => {
    const at = computeExpiresAt(3600, Date.UTC(2026, 0, 1, 0, 0, 0));
    // 3600s − 60s skew = +3540s
    expect(at).toBe(new Date(Date.UTC(2026, 0, 1, 0, 59, 0)).toISOString());
  });

  it("treats a past expiry as expired", () => {
    expect(isTokenExpired("2020-01-01T00:00:00Z", Date.now())).toBe(true);
  });

  it("treats a future expiry (> skew) as fresh", () => {
    const future = new Date(Date.now() + 10 * 60_000).toISOString();
    expect(isTokenExpired(future, Date.now())).toBe(false);
  });

  it("treats unparseable strings as expired", () => {
    expect(isTokenExpired("not-a-date", Date.now())).toBe(true);
  });
});

describe("exchangeCodeForToken", () => {
  it("POSTs application/x-www-form-urlencoded body and returns parsed token", async () => {
    const fakeFetch: typeof fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(body).toContain("grant_type=authorization_code");
      expect(body).toContain("code=ABC");
      expect(body).toContain("client_id=test-client");
      return new Response(
        JSON.stringify({
          access_token: "a-tok",
          refresh_token: "r-tok",
          expires_in: 7200,
          token_type: "Bearer",
          scope: "user_data",
        }),
        { status: 200 },
      );
    });
    const tok = await exchangeCodeForToken(makeConfig(), "ABC", fakeFetch);
    expect(tok.access_token).toBe("a-tok");
    expect(tok.refresh_token).toBe("r-tok");
    expect(tok.expires_in).toBe(7200);
  });

  it("throws SharesightOAuthError on non-2xx", async () => {
    const fakeFetch = vi.fn(
      async () => new Response("bad code", { status: 400 }),
    );
    await expect(
      exchangeCodeForToken(makeConfig(), "ABC", fakeFetch),
    ).rejects.toBeInstanceOf(SharesightOAuthError);
  });

  it("throws when response is missing access_token", async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ expires_in: 7200 }), { status: 200 }),
    );
    await expect(
      exchangeCodeForToken(makeConfig(), "ABC", fakeFetch),
    ).rejects.toThrow(/access_token/);
  });
});

describe("refreshAccessToken", () => {
  it("POSTs grant_type=refresh_token + refresh_token + client creds", async () => {
    const fakeFetch: typeof fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=R-OLD");
      return new Response(
        JSON.stringify({
          access_token: "A-NEW",
          refresh_token: "R-NEW",
          expires_in: 3600,
        }),
        { status: 200 },
      );
    });
    const tok = await refreshAccessToken(makeConfig(), "R-OLD", fakeFetch);
    expect(tok.access_token).toBe("A-NEW");
    expect(tok.refresh_token).toBe("R-NEW");
  });

  it("handles refresh responses that omit refresh_token (single-use refresh)", async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ access_token: "A-NEW", expires_in: 3600 }),
          { status: 200 },
        ),
    );
    const tok = await refreshAccessToken(makeConfig(), "R-OLD", fakeFetch);
    expect(tok.refresh_token).toBeNull();
  });

  it("throws SharesightOAuthError on 401", async () => {
    const fakeFetch = vi.fn(
      async () => new Response("revoked", { status: 401 }),
    );
    await expect(
      refreshAccessToken(makeConfig(), "R-BAD", fakeFetch),
    ).rejects.toBeInstanceOf(SharesightOAuthError);
  });
});

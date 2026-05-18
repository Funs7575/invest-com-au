import { describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchHoldings,
  fetchPortfolios,
  refreshAccessToken,
  type FetchImpl,
} from "@/lib/sharesight/client";
import type { SharesightConfig } from "@/lib/sharesight/config";

function makeFetchMock(impl: FetchImpl) {
  return vi.fn(impl);
}

const config: SharesightConfig = {
  clientId: "cid",
  clientSecret: "csec",
  redirectUri: "https://example.test/api/account/holdings/sharesight/callback",
  apiBase: "https://api.sharesight.com/api/v2",
  authBase: "https://api.sharesight.com/oauth2",
  scope: "read_portfolios",
};

function mockJsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function mockText(status: number, body: string): Response {
  return new Response(body, { status });
}

describe("buildAuthorizeUrl", () => {
  it("produces a well-formed OAuth authorize URL with all required params", () => {
    const url = buildAuthorizeUrl(config, "abc123");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://api.sharesight.com/oauth2/authorize",
    );
    expect(parsed.searchParams.get("client_id")).toBe("cid");
    expect(parsed.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("read_portfolios");
    expect(parsed.searchParams.get("state")).toBe("abc123");
  });
});

describe("exchangeCodeForToken", () => {
  it("POSTs the authorization_code grant and returns the token payload", async () => {
    const fetchMock = makeFetchMock(async () =>
      mockJsonOk({
        access_token: "at",
        refresh_token: "rt",
        expires_in: 7200,
        scope: "read_portfolios",
        token_type: "bearer",
      }),
    );
    const out = await exchangeCodeForToken(config, "the-code", fetchMock);
    expect(out.access_token).toBe("at");
    expect(out.refresh_token).toBe("rt");
    expect(out.expires_in).toBe(7200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call!;
    expect(url).toBe("https://api.sharesight.com/oauth2/token");
    const body = new URLSearchParams((init as RequestInit).body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("the-code");
    expect(body.get("client_id")).toBe("cid");
    expect(body.get("client_secret")).toBe("csec");
    expect(body.get("redirect_uri")).toBe(config.redirectUri);
  });

  it("throws a descriptive error on a non-2xx response", async () => {
    const fetchMock = makeFetchMock(async () => mockText(401, "bad_credentials"));
    await expect(exchangeCodeForToken(config, "x", fetchMock)).rejects.toThrow(
      /sharesight_token_exchange_failed:401/,
    );
  });
});

describe("refreshAccessToken", () => {
  it("POSTs the refresh_token grant", async () => {
    const fetchMock = makeFetchMock(async () =>
      mockJsonOk({ access_token: "at2", expires_in: 3600, token_type: "bearer" }),
    );
    const out = await refreshAccessToken(config, "rt", fetchMock);
    expect(out.access_token).toBe("at2");
    const call = fetchMock.mock.calls[0]!;
    const body = new URLSearchParams((call[1] as RequestInit).body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("rt");
  });

  it("throws on a non-2xx response", async () => {
    const fetchMock = makeFetchMock(async () => mockText(400, "invalid_grant"));
    await expect(refreshAccessToken(config, "rt", fetchMock)).rejects.toThrow(
      /sharesight_token_refresh_failed:400/,
    );
  });
});

describe("fetchPortfolios", () => {
  it("returns portfolios with an Authorization: Bearer header", async () => {
    const fetchMock = makeFetchMock(async () =>
      mockJsonOk({ portfolios: [{ id: 42, name: "Main" }] }),
    );
    const out = await fetchPortfolios(config, "at", fetchMock);
    expect(out).toEqual([{ id: 42, name: "Main" }]);
    const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers.authorization).toBe("Bearer at");
  });

  it("returns an empty array if Sharesight returns no portfolios key", async () => {
    const fetchMock = makeFetchMock(async () => mockJsonOk({}));
    const out = await fetchPortfolios(config, "at", fetchMock);
    expect(out).toEqual([]);
  });

  it("throws on a non-2xx", async () => {
    const fetchMock = makeFetchMock(async () => mockText(403, "forbidden"));
    await expect(fetchPortfolios(config, "at", fetchMock)).rejects.toThrow(
      /sharesight_portfolios_failed:403/,
    );
  });
});

describe("fetchHoldings", () => {
  it("encodes the portfolio id in the URL and forwards the bearer token", async () => {
    const fetchMock = makeFetchMock(async () =>
      mockJsonOk({
        holdings: [
          {
            instrument_code: "BHP",
            market_code: "ASX",
            quantity: 100,
            average_buy_price: 42,
            first_purchase_date: "2024-01-01",
            currency_code: "AUD",
          },
        ],
      }),
    );
    const out = await fetchHoldings(config, "at", "abc/def", fetchMock);
    expect(out).toHaveLength(1);
    expect(out[0]!.instrument_code).toBe("BHP");
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://api.sharesight.com/api/v2/portfolios/abc%2Fdef/holdings.json",
    );
  });

  it("throws on a non-2xx", async () => {
    const fetchMock = makeFetchMock(async () => mockText(500, "boom"));
    await expect(fetchHoldings(config, "at", "1", fetchMock)).rejects.toThrow(
      /sharesight_holdings_failed:500/,
    );
  });
});

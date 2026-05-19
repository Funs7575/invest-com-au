import { describe, it, expect, vi } from "vitest";
import {
  fetchHoldings,
  fetchPortfolios,
  mapMarketCode,
  SharesightApiError,
  transformHoldings,
  type SharesightHolding,
} from "@/lib/sharesight/api";

describe("mapMarketCode", () => {
  it("maps AU/ASX-like codes to ASX", () => {
    expect(mapMarketCode("ASX")).toBe("ASX");
    expect(mapMarketCode("AU")).toBe("ASX");
    expect(mapMarketCode("AX")).toBe("ASX");
    expect(mapMarketCode("asx")).toBe("ASX");
  });

  it("maps US exchanges to NASDAQ / NYSE", () => {
    expect(mapMarketCode("NASDAQ")).toBe("NASDAQ");
    expect(mapMarketCode("NMS")).toBe("NASDAQ");
    expect(mapMarketCode("NYSE")).toBe("NYSE");
    expect(mapMarketCode("NYQ")).toBe("NYSE");
    expect(mapMarketCode("AMEX")).toBe("NYSE");
  });

  it("maps Asia-Pacific codes", () => {
    expect(mapMarketCode("HKG")).toBe("HKEX");
    expect(mapMarketCode("SGX")).toBe("SGX");
    expect(mapMarketCode("TYO")).toBe("TYO");
    expect(mapMarketCode("KRX")).toBe("KRX");
  });

  it("returns OTHER for unknown / missing codes", () => {
    expect(mapMarketCode("MOEX")).toBe("OTHER");
    expect(mapMarketCode("")).toBe("OTHER");
    expect(mapMarketCode(null)).toBe("OTHER");
    expect(mapMarketCode(undefined)).toBe("OTHER");
  });
});

describe("transformHoldings", () => {
  const baseHolding: SharesightHolding = {
    id: 1,
    instrument: { id: 10, code: "BHP", market_code: "ASX", name: "BHP Group" },
    quantity: 100,
    cost_base: 4520.0,
    grant_date: "2025-03-15",
  };

  it("converts a clean AUD ASX row to ParsedHoldingRow", () => {
    const { rows, errors } = transformHoldings([baseHolding], "AUD");
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.ticker).toBe("BHP");
    expect(r.exchange).toBe("ASX");
    expect(r.shares).toBe(100);
    // (4520.00 AUD / 100 shares) → 4520 cents per share
    expect(r.cost_basis_per_share_cents).toBe(4520);
    expect(r.acquired_at).toBe("2025-03-15");
    expect(r.broker_slug).toBe("sharesight");
    expect(r.notes).toBe("Imported from Sharesight");
  });

  it("upper-cases tickers", () => {
    const { rows } = transformHoldings(
      [{ ...baseHolding, instrument: { ...baseHolding.instrument, code: "bhp" } }],
      "AUD",
    );
    expect(rows[0]?.ticker).toBe("BHP");
  });

  it("accepts granted_date as an alias for grant_date", () => {
    const h: SharesightHolding = {
      ...baseHolding,
      grant_date: null,
      granted_date: "2024-12-01",
    };
    const { rows, errors } = transformHoldings([h], "AUD");
    expect(errors).toHaveLength(0);
    expect(rows[0]?.acquired_at).toBe("2024-12-01");
  });

  it("rejects non-AUD portfolios with a FX-conversion message", () => {
    const { rows, errors } = transformHoldings([baseHolding], "USD");
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/non-AUD.*USD.*FX/);
  });

  it("rejects rows with non-positive quantity", () => {
    const bad: SharesightHolding = { ...baseHolding, quantity: 0 };
    const { rows, errors } = transformHoldings([bad], "AUD");
    expect(rows).toHaveLength(0);
    expect(errors[0]?.reason).toMatch(/quantity/);
  });

  it("rejects rows missing cost_base", () => {
    const bad: SharesightHolding = { ...baseHolding, cost_base: null };
    const { rows, errors } = transformHoldings([bad], "AUD");
    expect(rows).toHaveLength(0);
    expect(errors[0]?.reason).toMatch(/cost_base/);
  });

  it("rejects rows missing instrument code", () => {
    const bad: SharesightHolding = {
      ...baseHolding,
      instrument: { ...baseHolding.instrument, code: "" },
    };
    const { rows, errors } = transformHoldings([bad], "AUD");
    expect(rows).toHaveLength(0);
    expect(errors[0]?.reason).toMatch(/instrument code/);
  });

  it("rejects rows with unparseable grant_date", () => {
    const bad: SharesightHolding = { ...baseHolding, grant_date: "not-a-date" };
    const { rows, errors } = transformHoldings([bad], "AUD");
    expect(rows).toHaveLength(0);
    expect(errors[0]?.reason).toMatch(/grant_date/);
  });

  it("normalises ISO datetimes to YYYY-MM-DD", () => {
    const h: SharesightHolding = {
      ...baseHolding,
      grant_date: "2025-03-15T09:30:00Z",
    };
    const { rows } = transformHoldings([h], "AUD");
    expect(rows[0]?.acquired_at).toBe("2025-03-15");
  });

  it("maps unknown market codes to OTHER without rejecting the row", () => {
    const h: SharesightHolding = {
      ...baseHolding,
      instrument: { ...baseHolding.instrument, market_code: "MOEX" },
    };
    const { rows } = transformHoldings([h], "AUD");
    expect(rows[0]?.exchange).toBe("OTHER");
  });
});

describe("fetchPortfolios + fetchHoldings", () => {
  it("fetchPortfolios hits /api/v3/portfolios with bearer auth", async () => {
    const fakeFetch: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toBe("https://api.sharesight.test/api/v3/portfolios");
      const auth = (init?.headers as Record<string, string> | undefined)?.[
        "Authorization"
      ];
      expect(auth).toBe("Bearer ACCESS-1");
      return new Response(
        JSON.stringify({
          portfolios: [{ id: 42, name: "Main" }],
        }),
        { status: 200 },
      );
    });
    const list = await fetchPortfolios(
      "ACCESS-1",
      "https://api.sharesight.test",
      fakeFetch,
    );
    expect(list).toEqual([{ id: 42, name: "Main" }]);
  });

  it("fetchHoldings hits /api/v3/portfolios/{id}/holdings", async () => {
    const fakeFetch: typeof fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toBe(
        "https://api.sharesight.test/api/v3/portfolios/42/holdings",
      );
      return new Response(
        JSON.stringify({
          holdings: [
            {
              id: 1,
              instrument: { code: "BHP", market_code: "ASX" },
              quantity: 10,
              cost_base: 450,
              grant_date: "2025-01-01",
            },
          ],
        }),
        { status: 200 },
      );
    });
    const list = await fetchHoldings(
      "ACCESS-1",
      "https://api.sharesight.test",
      42,
      fakeFetch,
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.instrument.code).toBe("BHP");
  });

  it("fetchPortfolios throws SharesightApiError on 401", async () => {
    const fakeFetch = vi.fn(
      async () => new Response("expired", { status: 401 }),
    );
    await expect(
      fetchPortfolios("ACCESS-1", "https://api.sharesight.test", fakeFetch),
    ).rejects.toBeInstanceOf(SharesightApiError);
  });

  it("fetchPortfolios returns empty list when API returns no portfolios key", async () => {
    const fakeFetch = vi.fn(
      async () => new Response(JSON.stringify({}), { status: 200 }),
    );
    const list = await fetchPortfolios(
      "ACCESS-1",
      "https://api.sharesight.test",
      fakeFetch,
    );
    expect(list).toEqual([]);
  });
});

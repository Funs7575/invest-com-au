import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let cachedRow: Record<string, unknown> | null = null;
const upsertCalls: Record<string, unknown>[] = [];
const updateCalls: Record<string, unknown>[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table !== "holdings_price_cache") {
    throw new Error(`unexpected table: ${table}`);
  }
  return {
    select: () => {
      const chain = {
        eq: () => chain,
        maybeSingle: async () => ({ data: cachedRow, error: null }),
      };
      return chain;
    },
    upsert: async (row: Record<string, unknown>) => {
      upsertCalls.push(row);
      return { error: null };
    },
    update: (row: Record<string, unknown>) => {
      const chain = {
        eq: () => chain,
        then: (resolve: (v: unknown) => void) => {
          updateCalls.push(row);
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      // Return both an awaitable + chain (Supabase client behaves as either)
      return Object.assign(Promise.resolve({ error: null }), chain);
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const fetchMock = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("@/lib/holdings/value-source", () => ({
  fetchPriceForHolding: (...args: unknown[]) => fetchMock(...args),
}));

import { getCurrentPrice } from "@/lib/holdings/value";

const NOW_MS = new Date("2026-05-10T12:00:00Z").getTime();

describe("getCurrentPrice", () => {
  beforeEach(() => {
    cachedRow = null;
    upsertCalls.length = 0;
    updateCalls.length = 0;
    fetchMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_MS));
  });

  it("returns cached price when fresh + non-stale", async () => {
    cachedRow = {
      price_cents: 4500,
      currency: "AUD",
      source: "yahoo",
      fetched_at: new Date(NOW_MS - 60 * 60 * 1000).toISOString(), // 1h old
      last_attempt_at: new Date(NOW_MS - 60 * 60 * 1000).toISOString(),
    };
    const r = await getCurrentPrice("BHP", "ASX");
    expect(r).toEqual({
      priceCents: 4500,
      currency: "AUD",
      source: "yahoo",
      fetchedAt: expect.any(String),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls upstream on cache miss + caches the result", async () => {
    cachedRow = null;
    fetchMock.mockResolvedValueOnce({
      priceCents: 4800,
      currency: "AUD",
      source: "yahoo",
    });
    const r = await getCurrentPrice("BHP", "ASX");
    expect(r?.priceCents).toBe(4800);
    expect(r?.source).toBe("yahoo");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(upsertCalls[0]).toMatchObject({
      ticker: "BHP",
      exchange: "ASX",
      price_cents: 4800,
      source: "yahoo",
    });
  });

  it("re-fetches when cache is past its 24h TTL", async () => {
    cachedRow = {
      price_cents: 4000,
      currency: "AUD",
      source: "yahoo",
      fetched_at: new Date(NOW_MS - 25 * 60 * 60 * 1000).toISOString(), // 25h old
      last_attempt_at: new Date(NOW_MS - 25 * 60 * 60 * 1000).toISOString(),
    };
    fetchMock.mockResolvedValueOnce({
      priceCents: 4200,
      currency: "AUD",
      source: "yahoo",
    });
    const r = await getCurrentPrice("BHP", "ASX");
    expect(r?.priceCents).toBe(4200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("crypto cache TTL is 1h (re-fetches at 90 min)", async () => {
    cachedRow = {
      price_cents: 6_000_000,
      currency: "AUD",
      source: "coingecko",
      fetched_at: new Date(NOW_MS - 90 * 60 * 1000).toISOString(),
      last_attempt_at: new Date(NOW_MS - 90 * 60 * 1000).toISOString(),
    };
    fetchMock.mockResolvedValueOnce({
      priceCents: 6_100_000,
      currency: "AUD",
      source: "coingecko",
    });
    const r = await getCurrentPrice("BTC", "CRYPTO");
    expect(r?.priceCents).toBe(6_100_000);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back to stale cache when upstream returns null", async () => {
    cachedRow = {
      price_cents: 4000,
      currency: "AUD",
      source: "yahoo",
      fetched_at: new Date(NOW_MS - 48 * 60 * 60 * 1000).toISOString(), // 48h old
      last_attempt_at: new Date(NOW_MS - 48 * 60 * 60 * 1000).toISOString(),
    };
    fetchMock.mockResolvedValueOnce(null);
    const r = await getCurrentPrice("BHP", "ASX");
    expect(r?.source).toBe("stale");
    expect(r?.priceCents).toBe(4000);
  });

  it("returns null when there's no cache + upstream fails", async () => {
    cachedRow = null;
    fetchMock.mockResolvedValueOnce(null);
    const r = await getCurrentPrice("UNKNOWN", "OTHER");
    expect(r).toBeNull();
  });

  it("returns null when stale cache is older than 7-day fallback window", async () => {
    cachedRow = {
      price_cents: 4000,
      currency: "AUD",
      source: "yahoo",
      fetched_at: new Date(NOW_MS - 8 * 24 * 60 * 60 * 1000).toISOString(),
      last_attempt_at: new Date(NOW_MS - 8 * 24 * 60 * 60 * 1000).toISOString(),
    };
    fetchMock.mockResolvedValueOnce(null);
    const r = await getCurrentPrice("BHP", "ASX");
    expect(r).toBeNull();
  });

  it("does NOT call upstream within the 5-min attempt-throttle window", async () => {
    cachedRow = {
      price_cents: 4000,
      currency: "AUD",
      source: "stale",
      fetched_at: new Date(NOW_MS - 25 * 60 * 60 * 1000).toISOString(), // outside 24h TTL
      last_attempt_at: new Date(NOW_MS - 2 * 60 * 1000).toISOString(),  // 2 min ago
    };
    const r = await getCurrentPrice("BHP", "ASX");
    expect(r?.source).toBe("stale");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const limitMock = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ["select", "eq", "in", "not", "order", "neq"]) {
  chain[m] = vi.fn(() => chain);
}
chain.limit = limitMock.mockImplementation(() => chain);
// The awaited terminal — the chain itself is thenable.
let chainResult: { data: unknown; error: { message: string } | null } = {
  data: [],
  error: null,
};
(chain as { then?: unknown }).then = (
  resolve: (v: typeof chainResult) => void,
) => resolve(chainResult);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: vi.fn(() => chain) })),
}));

import {
  buildSoldUpdates,
  isMissingSoldColumnsError,
  mergeComparables,
  fetchSoldComparables,
} from "@/lib/listings/sold-archive";

describe("buildSoldUpdates", () => {
  it("stamps status + sold_at, and the disclosed price when valid", () => {
    const updates = buildSoldUpdates(45_000_00);
    expect(updates.status).toBe("sold");
    expect(typeof updates.sold_at).toBe("string");
    expect(updates.sold_price_cents).toBe(45_000_00);
  });

  it("omits the price when undisclosed or invalid", () => {
    for (const bad of [null, undefined, 0, -5, NaN, Infinity]) {
      const updates = buildSoldUpdates(bad as number | null);
      expect(updates.sold_price_cents).toBeUndefined();
      expect(updates.status).toBe("sold");
    }
  });

  it("rounds fractional cents", () => {
    expect(buildSoldUpdates(1000.6).sold_price_cents).toBe(1001);
  });
});

describe("isMissingSoldColumnsError", () => {
  it("matches missing-column shapes and nothing else", () => {
    expect(isMissingSoldColumnsError("column \"sold_price_cents\" does not exist")).toBe(true);
    expect(isMissingSoldColumnsError("PGRST204: sold_at not found in schema cache")).toBe(true);
    expect(isMissingSoldColumnsError("permission denied")).toBe(false);
    expect(isMissingSoldColumnsError(undefined)).toBe(false);
  });
});

describe("mergeComparables", () => {
  const comp = (label: string) => ({ label });

  it("platform comps lead and the cap holds", () => {
    const merged = mergeComparables(
      [comp("p1"), comp("p2")],
      [comp("s1"), comp("s2"), comp("s3"), comp("s4"), comp("s5")],
    );
    expect(merged).toHaveLength(6);
    expect(merged[0]).toEqual(comp("p1"));
    expect(merged[2]).toEqual(comp("s1"));
  });
});

describe("fetchSoldComparables", () => {
  beforeEach(() => {
    chainResult = { data: [], error: null };
    vi.clearAllMocks();
  });

  it("maps sold rows into ComparableSale shape with the platform source", async () => {
    chainResult = {
      data: [
        {
          title: "Riverina Aggregation",
          location_state: "NSW",
          sold_price_cents: 4_200_000_00,
          sold_at: "2026-03-15T00:00:00Z",
        },
      ],
      error: null,
    };
    const comps = await fetchSoldComparables("farmland");
    expect(comps).toHaveLength(1);
    expect(comps[0]).toMatchObject({
      label: "Riverina Aggregation — NSW",
      price: "$4.2M",
      source: "Sold on Invest.com.au",
    });
    expect(comps[0]?.when).toMatch(/2026/);
  });

  it("returns [] on query errors (pre-migration fail-soft)", async () => {
    chainResult = { data: null, error: { message: "column \"sold_at\" does not exist" } };
    expect(await fetchSoldComparables("farmland")).toEqual([]);
  });

  it("returns [] when the client throws", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockRejectedValueOnce(new Error("network"));
    expect(await fetchSoldComparables("mining")).toEqual([]);
  });
});

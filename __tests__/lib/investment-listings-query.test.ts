import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let listingsData: unknown[] | null = [];
let countData: number | null = 0;
let queryError: { message: string; code?: string } | null = null;
let throwOnCreate = false;

const inCalls: { col: string; val: unknown[] }[] = [];
const eqCalls: { col: string; val: unknown }[] = [];
const neqCalls: { col: string; val: unknown }[] = [];

const mockFrom = vi.fn(() => {
  const chain = {
    select: (_cols: string, _opts?: unknown) => chain,
    eq(col: string, val: unknown) {
      eqCalls.push({ col, val });
      return chain;
    },
    neq(col: string, val: unknown) {
      neqCalls.push({ col, val });
      return chain;
    },
    in(col: string, val: unknown[]) {
      inCalls.push({ col, val });
      return chain;
    },
    order: () => chain,
    // limit must return the chain (so .eq can chain after it) AND be
    // awaitable by virtue of chain.then. No separate limit promise.
    limit: () => chain,
    maybeSingle: async () => {
      if (Array.isArray(listingsData)) {
        return { data: listingsData[0] ?? null, error: queryError };
      }
      return { data: null, error: queryError };
    },
    then(cb: (v: unknown) => unknown) {
      return Promise.resolve(cb({
        data: listingsData,
        error: queryError,
        count: countData,
      }));
    },
  };
  return chain;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    if (throwOnCreate) throw new Error("missing cookies");
    return { from: mockFrom };
  }),
}));

import {
  fetchListingsByVertical,
  countListingsByVertical,
  fetchListingsBySubCategory,
  fetchListingBySlug,
  fetchRelatedListings,
  ALTERNATIVES_SUB_CATEGORIES,
} from "@/lib/investment-listings-query";

describe("ALTERNATIVES_SUB_CATEGORIES constant", () => {
  it("contains the canonical alternative sub-categories", () => {
    expect(ALTERNATIVES_SUB_CATEGORIES).toContain("art");
    expect(ALTERNATIVES_SUB_CATEGORIES).toContain("wine");
    expect(ALTERNATIVES_SUB_CATEGORIES).toContain("watches");
  });
});

describe("fetchListingsByVertical", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listingsData = [];
    queryError = null;
    throwOnCreate = false;
    eqCalls.length = 0;
    inCalls.length = 0;
    neqCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns [] when the table is empty", async () => {
    expect(await fetchListingsByVertical("mining")).toEqual([]);
  });

  it("returns rows when present", async () => {
    listingsData = [{ id: 1, slug: "a" }, { id: 2, slug: "b" }];
    expect(await fetchListingsByVertical("mining")).toEqual(listingsData);
  });

  it("filters by vertical + status=active", async () => {
    await fetchListingsByVertical("mining");
    expect(eqCalls).toContainEqual({ col: "vertical", val: "mining" });
    expect(eqCalls).toContainEqual({ col: "status", val: "active" });
  });

  it("passes subCategories to .in() when provided", async () => {
    await fetchListingsByVertical("fund", { subCategories: ["art", "wine"] });
    expect(inCalls).toContainEqual({
      col: "sub_category",
      val: ["art", "wine"],
    });
  });

  it("returns [] on query error (never throws)", async () => {
    queryError = { message: "RLS denied", code: "42501" };
    expect(await fetchListingsByVertical("mining")).toEqual([]);
  });

  it("returns [] when createClient throws (graceful degrade)", async () => {
    throwOnCreate = true;
    expect(await fetchListingsByVertical("mining")).toEqual([]);
  });
});

describe("countListingsByVertical", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listingsData = [];
    queryError = null;
    countData = 0;
    throwOnCreate = false;
  });

  it("returns the count when the query succeeds", async () => {
    countData = 42;
    expect(await countListingsByVertical("mining")).toBe(42);
  });

  it("returns 0 on null count", async () => {
    countData = null;
    expect(await countListingsByVertical("mining")).toBe(0);
  });

  it("returns 0 on query error", async () => {
    queryError = { message: "down" };
    expect(await countListingsByVertical("mining")).toBe(0);
  });

  it("returns 0 when createClient throws", async () => {
    throwOnCreate = true;
    expect(await countListingsByVertical("mining")).toBe(0);
    throwOnCreate = false;
  });
});

describe("fetchListingsBySubCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listingsData = [];
    queryError = null;
    throwOnCreate = false;
  });

  it("returns [] for empty subCategory", async () => {
    expect(await fetchListingsBySubCategory("fund", "")).toEqual([]);
  });

  it("filters by vertical + sub_category + active status", async () => {
    listingsData = [{ id: 1 }];
    const res = await fetchListingsBySubCategory("fund", "art");
    expect(res).toEqual([{ id: 1 }]);
    expect(eqCalls).toContainEqual({ col: "vertical", val: "fund" });
    expect(eqCalls).toContainEqual({ col: "sub_category", val: "art" });
    expect(eqCalls).toContainEqual({ col: "status", val: "active" });
  });

  it("returns [] on query error", async () => {
    queryError = { message: "schema mismatch", code: "42703" };
    expect(await fetchListingsBySubCategory("fund", "art")).toEqual([]);
  });
});

describe("fetchListingBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listingsData = null;
    queryError = null;
  });

  it("returns null for empty slug", async () => {
    expect(await fetchListingBySlug("mining", "")).toBeNull();
  });

  it("returns null when no row matches", async () => {
    listingsData = [];
    expect(await fetchListingBySlug("mining", "unknown")).toBeNull();
  });

  it("returns the row when present", async () => {
    listingsData = [{ id: 1, slug: "bhp" }];
    const res = await fetchListingBySlug("mining", "bhp");
    expect(res).toEqual({ id: 1, slug: "bhp" });
  });

  it("returns null on error", async () => {
    queryError = { message: "down", code: "x" };
    expect(await fetchListingBySlug("mining", "bhp")).toBeNull();
  });
});

describe("fetchRelatedListings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listingsData = [];
    queryError = null;
    neqCalls.length = 0;
    eqCalls.length = 0;
    inCalls.length = 0;
  });

  it("returns rows excluding the given slug", async () => {
    listingsData = [{ id: 1 }, { id: 2 }];
    const res = await fetchRelatedListings("mining", "excluded", null);
    expect(res.length).toBe(2);
    expect(neqCalls).toContainEqual({ col: "slug", val: "excluded" });
  });

  it("adds sub_category filter when provided", async () => {
    await fetchRelatedListings("fund", "slug", "art");
    expect(eqCalls).toContainEqual({ col: "sub_category", val: "art" });
  });

  it("skips sub_category filter when null", async () => {
    await fetchRelatedListings("fund", "slug", null);
    // No eq call on sub_category
    expect(
      eqCalls.some((c) => c.col === "sub_category"),
    ).toBe(false);
  });

  it("returns [] on error", async () => {
    queryError = { message: "down" };
    expect(
      await fetchRelatedListings("mining", "slug", null),
    ).toEqual([]);
  });
});

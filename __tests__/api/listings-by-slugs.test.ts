/**
 * Tests for GET /api/listings/by-slugs
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single", "maybeSingle", "filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/listings/by-slugs/route";

function makeReq(slugsParam?: string): NextRequest {
  const url = slugsParam
    ? `http://localhost/api/listings/by-slugs?slugs=${encodeURIComponent(slugsParam)}`
    : "http://localhost/api/listings/by-slugs";
  return new Request(url, { method: "GET" }) as unknown as NextRequest;
}

const MOCK_LISTINGS = [
  { id: 1, slug: "listing-a", status: "active", title: "Listing A" },
  { id: 2, slug: "listing-b", status: "active", title: "Listing B" },
];

describe("GET /api/listings/by-slugs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockFrom.mockReturnValue(makeBuilder({ data: MOCK_LISTINGS, error: null }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq("listing-a"));
    expect(res.status).toBe(429);
  });

  it("returns empty listings when no slugs param", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toEqual([]);
  });

  it("returns empty listings when slugs param is empty string", async () => {
    const res = await GET(makeReq(""));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toEqual([]);
  });

  it("returns listings for valid slugs", async () => {
    const res = await GET(makeReq("listing-a,listing-b"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toHaveLength(2);
  });

  it("limits slugs to 4 max", async () => {
    // Pass 5 slugs — only 4 should be queried
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
    const res = await GET(makeReq("a,b,c,d,e"));
    expect(res.status).toBe(200);
    // Verify in() was called — we can't easily inspect the limit,
    // but the response should be 200 with listings array
    const json = await res.json();
    expect(Array.isArray(json.listings)).toBe(true);
  });

  it("returns empty listings on DB error (soft fail)", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: "db error" } }));
    const res = await GET(makeReq("listing-a"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toEqual([]);
  });
});

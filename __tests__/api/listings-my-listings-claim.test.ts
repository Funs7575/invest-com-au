/**
 * Tests for POST /api/listings/my-listings/claim
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  data: { user: { id: "u1", email: "owner@example.com" } },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single", "maybeSingle", "filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/listings/my-listings/claim/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/listings/my-listings/claim", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const VALID_BODY = {
  listing_id: 42,
  listing_table: "investment_listings",
};

const MOCK_LISTING = {
  id: 42,
  contact_email: "owner@example.com",
  slug: "my-listing",
  title: "My Listing",
};

describe("POST /api/listings/my-listings/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "owner@example.com" } } });

    // Default: maybeSingle returns the listing; upsert succeeds
    const listingBuilder = makeBuilder({ data: MOCK_LISTING, error: null });
    const upsertBuilder = makeBuilder({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "investment_listings" || table === "property_listings") {
        return listingBuilder;
      }
      return upsertBuilder;
    });
  });

  it("returns 401 when user not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user has no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: null } } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/listings/my-listings/claim", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when listing_table is invalid", async () => {
    const res = await POST(makeReq({ listing_id: 1, listing_table: "bad_table" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when listing_id is negative", async () => {
    const res = await POST(makeReq({ listing_id: -1, listing_table: "investment_listings" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing not found", async () => {
    const notFoundBuilder = makeBuilder({ data: null, error: null });
    const upsertBuilder = makeBuilder({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "investment_listings") return notFoundBuilder;
      return upsertBuilder;
    });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 403 when user email does not match listing email", async () => {
    const mismatchListing = { ...MOCK_LISTING, contact_email: "other@example.com" };
    const mismatchBuilder = makeBuilder({ data: mismatchListing, error: null });
    mockAdminFrom.mockImplementation(() => mismatchBuilder);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 200 with ok:true when claim succeeds", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.listing).toBeDefined();
  });

  it("works with property_listings table", async () => {
    const propBuilder = makeBuilder({ data: MOCK_LISTING, error: null });
    const upsertBuilder = makeBuilder({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "property_listings") return propBuilder;
      return upsertBuilder;
    });
    const res = await POST(makeReq({ listing_id: 42, listing_table: "property_listings" }));
    expect(res.status).toBe(200);
  });
});

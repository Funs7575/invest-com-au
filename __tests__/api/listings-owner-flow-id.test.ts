/**
 * Tests for PATCH /api/listings/owner-flow/[id]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "u1", email: "owner@example.com" } }, error: null })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

// maybeSingle and single return different things depending on the test
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/listings/types", async () => {
  const actual = await vi.importActual("@/lib/listings/types");
  return actual;
});

import { PATCH } from "@/app/api/listings/owner-flow/[id]/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/listings/owner-flow/listing-1", {
    method: "PATCH",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const ctx = { params: Promise.resolve({ id: "listing-1" }) } as Parameters<typeof PATCH>[1];

const draftListing = {
  id: "listing-1",
  owner_user_id: "u1",
  status: "draft",
  title: "Draft Title",
  kind: "property",
  asking_price_cents: null,
  currency: "AUD",
  location_state: null,
  description: null,
  payload: {},
  owner_email: "owner@example.com",
  moderation_notes: null,
  view_count: 0,
  match_request_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  approved_at: null,
  rejected_at: null,
  slug: "draft-title",
};

describe("PATCH /api/listings/owner-flow/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "owner@example.com" } }, error: null });

    // Default: select returns draft listing, update returns updated listing
    function makeChain(resolveValue: unknown) {
      const chain: Record<string, unknown> = {};
      for (const m of ["select","update","eq","maybeSingle","single","filter","in"]) {
        chain[m] = vi.fn(() => chain);
      }
      chain.maybySingle = vi.fn(async () => resolveValue);
      chain.maybeSingle = vi.fn(async () => resolveValue);
      chain.single = vi.fn(async () => resolveValue);
      return chain;
    }

    mockAdminFrom.mockImplementation(() => {
      return makeChain({ data: draftListing, error: null });
    });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(makeReq({ title: "New Title" }), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/listings/owner-flow/listing-1", {
      method: "PATCH",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 for body with extra fields (strict schema)", async () => {
    const res = await PATCH(makeReq({ title: "Hello", extraField: "bad" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makeReq({ title: "New Title" }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no fields to update", async () => {
    const res = await PATCH(makeReq({}), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing not found", async () => {
    mockAdminFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select","update","eq","filter","in"]) chain[m] = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
      chain.single = vi.fn(async () => ({ data: null, error: null }));
      return chain;
    });
    const res = await PATCH(makeReq({ title: "New Title" }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own listing", async () => {
    const otherListing = { ...draftListing, owner_user_id: "other-user" };
    mockAdminFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select","update","eq","filter","in"]) chain[m] = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => ({ data: otherListing, error: null }));
      chain.single = vi.fn(async () => ({ data: otherListing, error: null }));
      return chain;
    });
    const res = await PATCH(makeReq({ title: "New Title" }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 409 when listing is not a draft", async () => {
    const pendingListing = { ...draftListing, status: "pending_review" };
    mockAdminFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select","update","eq","filter","in"]) chain[m] = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => ({ data: pendingListing, error: null }));
      chain.single = vi.fn(async () => ({ data: pendingListing, error: null }));
      return chain;
    });
    const res = await PATCH(makeReq({ title: "New Title" }), ctx);
    expect(res.status).toBe(409);
  });
});

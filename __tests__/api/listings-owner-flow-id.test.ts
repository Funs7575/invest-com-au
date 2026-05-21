import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockIsAllowed, mockIpKey, mockAdminFrom, mockRowToListing } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockIpKey: vi.fn(() => "ip:1.2.3.4"),
  mockAdminFrom: vi.fn(),
  mockRowToListing: vi.fn((row: { id: string }) => ({ id: row.id, mapped: true })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

vi.mock("@/lib/listings/types", () => ({
  LISTING_KINDS: ["property", "business", "syndicate", "asset_other"],
  rowToListing: mockRowToListing,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { PATCH } from "@/app/api/listings/owner-flow/[id]/route";

const USER = { id: "owner-uuid-1", email: "alice@example.com" };
const LISTING_ID = "list-uuid-1";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/listings/owner-flow/${LISTING_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

// fetch chain: from().select().eq().maybeSingle()
function makeFetchChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// update chain: from().update().eq().select().single()
function makeUpdateChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

const DRAFT = { id: LISTING_ID, owner_user_id: USER.id, status: "draft" };

describe("PATCH /api/listings/owner-flow/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRowToListing.mockImplementation((row: { id: string }) => ({ id: row.id, mapped: true }));
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await PATCH(makeReq({ title: "New title" }), ctx(LISTING_ID));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest(`http://localhost/api/listings/owner-flow/${LISTING_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await PATCH(req, ctx(LISTING_ID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 for a body that fails validation", async () => {
    const res = await PATCH(makeReq({ title: "no" }), ctx(LISTING_ID));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown (strict) field", async () => {
    const res = await PATCH(makeReq({ bogus: true }), ctx(LISTING_ID));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makeReq({ title: "New title" }), ctx(LISTING_ID));
    expect(res.status).toBe(401);
  });

  it("returns 500 when the fetch errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(makeFetchChain({ data: null, error: { message: "boom" } }));
    const res = await PATCH(makeReq({ title: "New title" }), ctx(LISTING_ID));
    expect(res.status).toBe(500);
  });

  it("returns 404 when the listing is not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(makeFetchChain({ data: null, error: null }));
    const res = await PATCH(makeReq({ title: "New title" }), ctx(LISTING_ID));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the caller is not the owner", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(
      makeFetchChain({ data: { ...DRAFT, owner_user_id: "someone-else" }, error: null }),
    );
    const res = await PATCH(makeReq({ title: "New title" }), ctx(LISTING_ID));
    expect(res.status).toBe(403);
  });

  it("returns 409 when the listing is not a draft", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(
      makeFetchChain({ data: { ...DRAFT, status: "approved" }, error: null }),
    );
    const res = await PATCH(makeReq({ title: "New title" }), ctx(LISTING_ID));
    expect(res.status).toBe(409);
  });

  it("returns 400 when no updatable fields are provided", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(makeFetchChain({ data: DRAFT, error: null }));
    const res = await PATCH(makeReq({}), ctx(LISTING_ID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No fields to update." });
  });

  it("returns 500 when the update errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom
      .mockReturnValueOnce(makeFetchChain({ data: DRAFT, error: null }))
      .mockReturnValueOnce(makeUpdateChain({ data: null, error: { message: "boom" } }));
    const res = await PATCH(makeReq({ title: "New title" }), ctx(LISTING_ID));
    expect(res.status).toBe(500);
  });

  it("updates the draft and returns the mapped listing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const updatedRow = { ...DRAFT, title: "New title" };
    const updateChain = makeUpdateChain({ data: updatedRow, error: null });
    mockAdminFrom
      .mockReturnValueOnce(makeFetchChain({ data: DRAFT, error: null }))
      .mockReturnValueOnce(updateChain);
    const res = await PATCH(
      makeReq({ title: "  New title  ", currency: "aud", asking_price_cents: 1000 }),
      ctx(LISTING_ID),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, listing: { id: LISTING_ID, mapped: true } });
    const updateArg = updateChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateArg.title).toBe("New title");
    expect(updateArg.currency).toBe("AUD");
    expect(updateArg.asking_price_cents).toBe(1000);
    expect(updateArg.updated_at).toEqual(expect.any(String));
  });
});

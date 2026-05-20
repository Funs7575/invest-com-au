import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/listings/my-listings/claim/route";

const USER = { id: "user-uuid-1", email: "owner@example.com" };

const VALID_BODY = { listing_id: 42, listing_table: "investment_listings" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/listings/my-listings/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// admin.from(table).select().eq().maybeSingle()
function makeListingChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// admin.from(table).upsert() resolves directly
function makeUpsertChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.upsert = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/listings/my-listings/claim", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an invalid body via the validation wrapper (400)", async () => {
    const res = await POST(makeReq({ listing_id: 1, listing_table: "nope" }));
    expect(res.status).toBe(400);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("rejects a non-positive listing_id (400)", async () => {
    const res = await POST(makeReq({ listing_id: 0, listing_table: "investment_listings" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 401 when the user has no email", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "x", email: null } } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the listing is missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(makeListingChain({ data: null, error: null }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "listing_not_found" });
  });

  it("returns 404 when the listing lookup errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(makeListingChain({ data: null, error: { message: "db" } }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the listing email does not match the user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(
      makeListingChain({ data: { id: 42, contact_email: "other@example.com", slug: "s" }, error: null }),
    );
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "email_mismatch" });
  });

  it("returns 403 when the listing has no contact email", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValueOnce(
      makeListingChain({ data: { id: 42, contact_email: "", slug: "s" }, error: null }),
    );
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("happy path: upserts claim + owner account and returns ok", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const listingChain = makeListingChain({
      data: { id: 42, contact_email: "OWNER@example.com", slug: "my-slug", title: "My Listing" },
      error: null,
    });
    const claimChain = makeUpsertChain({ error: null });
    const accountChain = makeUpsertChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(listingChain) // listing lookup
      .mockReturnValueOnce(claimChain) // listing_claims
      .mockReturnValueOnce(accountChain); // listing_owner_accounts

    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      listing: { id: 42, table: "investment_listings", title: "My Listing" },
    });
    expect(mockAdminFrom).toHaveBeenNthCalledWith(2, "listing_claims");
    expect(mockAdminFrom).toHaveBeenNthCalledWith(3, "listing_owner_accounts");
    const claimArgs = claimChain.upsert.mock.calls[0] as unknown as [Record<string, unknown>, unknown];
    expect(claimArgs[0]).toMatchObject({
      auth_user_id: USER.id,
      claim_type: "listing",
      target_slug: "my-slug",
      status: "verified",
    });
  });

  it("uses property_listing claim_type for property_listings table", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const listingChain = makeListingChain({
      data: { id: 42, contact_email: "owner@example.com", slug: "prop-slug" },
      error: null,
    });
    const claimChain = makeUpsertChain({ error: null });
    const accountChain = makeUpsertChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(listingChain)
      .mockReturnValueOnce(claimChain)
      .mockReturnValueOnce(accountChain);

    const res = await POST(makeReq({ listing_id: 42, listing_table: "property_listings" }));
    expect(res.status).toBe(200);
    const claimArgs = claimChain.upsert.mock.calls[0] as unknown as [Record<string, unknown>, unknown];
    expect(claimArgs[0]).toMatchObject({ claim_type: "property_listing" });
  });

  it("returns 500 when the claim upsert fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const listingChain = makeListingChain({
      data: { id: 42, contact_email: "owner@example.com", slug: "s" },
      error: null,
    });
    mockAdminFrom
      .mockReturnValueOnce(listingChain)
      .mockReturnValueOnce(makeUpsertChain({ error: { message: "claim boom" } }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "claim_insert_failed", detail: "claim boom" });
  });

  it("still returns ok when only the owner-account upsert fails (best effort)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const listingChain = makeListingChain({
      data: { id: 42, contact_email: "owner@example.com", slug: "s", title: "T" },
      error: null,
    });
    mockAdminFrom
      .mockReturnValueOnce(listingChain)
      .mockReturnValueOnce(makeUpsertChain({ error: null }))
      .mockReturnValueOnce(makeUpsertChain({ error: { message: "account boom" } }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

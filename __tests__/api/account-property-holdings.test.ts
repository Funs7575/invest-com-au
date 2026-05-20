import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/account/property-holdings/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

const VALID_PROPERTY = {
  address_line: "1 Test St",
  purchase_price_cents: 50000000,
  purchase_date: "2024-01-15",
};

function makeReq(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/property-holdings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// GET: .from("property_holdings").select("*").order(...) — terminal .order()
function makeGetChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

// POST: .from(...).insert(...).select("*").single() — terminal .single()
function makeInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

// PATCH: .from(...).update(...).eq(...).select("*").single() — terminal .single()
function makeUpdateChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

// DELETE: .from(...).delete().eq(...) — terminal .eq()
function makeDeleteChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("GET /api/account/property-holdings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns the user's property holdings", async () => {
    const items = [
      { id: 1, address_line: "1 Test St", purchase_date: "2024-01-15" },
      { id: 2, address_line: "2 Test St", purchase_date: "2023-06-01" },
    ];
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeGetChain({ data: items, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items });
    expect(mockFrom).toHaveBeenCalledWith("property_holdings");
    expect(chain.order).toHaveBeenCalledWith("purchase_date", { ascending: false });
  });

  it("returns an empty array when data is null", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeGetChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("returns 500 when the read errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeGetChain({ data: null, error: { message: "boom" } }));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "fetch_failed" });
  });
});

describe("POST /api/account/property-holdings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq("POST", VALID_PROPERTY));
    expect(res.status).toBe(401);
  });

  it("inserts a property and returns 201 with the row", async () => {
    const row = { id: 7, auth_user_id: USER.id, ...VALID_PROPERTY };
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeInsertChain({ data: row, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(makeReq("POST", VALID_PROPERTY));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ item: row });
    expect(chain.insert).toHaveBeenCalledOnce();
    const insertArg = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({ auth_user_id: USER.id, address_line: "1 Test St" });
  });

  it("converts empty-string fields to null before insert", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeInsertChain({ data: { id: 8 }, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(makeReq("POST", { ...VALID_PROPERTY, state: "", property_type: "" }));
    expect(res.status).toBe(201);
    const insertArg = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg.state).toBeNull();
    expect(insertArg.property_type).toBeNull();
  });

  it("returns 500 when the insert errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: null, error: { message: "boom" } }));
    const res = await POST(makeReq("POST", VALID_PROPERTY));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "insert_failed", detail: "boom" });
  });

  it("rejects an invalid body via the validation wrapper (400)", async () => {
    // Missing required address_line / purchase_price_cents / purchase_date.
    const res = await POST(makeReq("POST", { suburb: "Bondi" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation_error" });
  });

  it("rejects a malformed purchase_date (400)", async () => {
    const res = await POST(makeReq("POST", { ...VALID_PROPERTY, purchase_date: "15/01/2024" }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/account/property-holdings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { id: 1, notes: "x" }));
    expect(res.status).toBe(401);
  });

  it("updates a property and returns the row", async () => {
    const row = { id: 1, notes: "updated" };
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeUpdateChain({ data: row, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await PATCH(makeReq("PATCH", { id: 1, notes: "updated" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ item: row });
    expect(chain.eq).toHaveBeenCalledWith("id", 1);
    const updateArg = chain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateArg).toMatchObject({ notes: "updated" });
    expect(updateArg.updated_at).toEqual(expect.any(String));
    // id is destructured out before the update payload is built.
    expect(updateArg.id).toBeUndefined();
  });

  it("returns 500 when the update errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeUpdateChain({ data: null, error: { message: "boom" } }));
    const res = await PATCH(makeReq("PATCH", { id: 1, notes: "x" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "update_failed", detail: "boom" });
  });

  it("rejects a missing id (400)", async () => {
    const res = await PATCH(makeReq("PATCH", { notes: "no id here" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation_error" });
  });
});

describe("DELETE /api/account/property-holdings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("deletes a property and returns ok", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeDeleteChain({ error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await DELETE(makeReq("DELETE", { id: 3 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(chain.delete).toHaveBeenCalledOnce();
    expect(chain.eq).toHaveBeenCalledWith("id", 3);
  });

  it("returns 500 when the delete errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeDeleteChain({ error: { message: "boom" } }));
    const res = await DELETE(makeReq("DELETE", { id: 3 }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "delete_failed" });
  });

  it("rejects a non-positive id (400)", async () => {
    const res = await DELETE(makeReq("DELETE", { id: -5 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation_error" });
  });
});

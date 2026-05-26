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

import { GET, POST, PATCH, DELETE } from "@/app/api/account/term-deposits/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

const VALID_TD = {
  institution_name: "ING Direct",
  provider_slug: "ing",
  principal_cents: 5000000,
  rate_bps: 510,
  term_months: 12,
  maturity_date: "2027-06-01",
  notes: "auto-renews unless cancelled",
};

function makeReq(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/term-deposits", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeUpdateChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeDeleteChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("GET /api/account/term-deposits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns the user's term deposits ordered by maturity_date", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const items = [{ id: 1, institution_name: "ING Direct" }];
    mockFrom.mockReturnValueOnce(makeGetChain({ data: items, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items });
  });

  it("returns an empty array when data is null", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeGetChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("returns 500 on DB error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeGetChain({ data: null, error: { message: "boom" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/account/term-deposits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq("POST", VALID_TD));
    expect(res.status).toBe(401);
  });

  it("creates a TD and returns 201", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const created = { id: 1, ...VALID_TD, user_id: USER.id };
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: created, error: null }));
    const res = await POST(makeReq("POST", VALID_TD));
    expect(res.status).toBe(201);
    const body = await res.json() as { item: unknown };
    expect(body.item).toEqual(created);
  });

  it("returns 400 for missing institution_name", async () => {
    const { institution_name: _, ...rest } = VALID_TD;
    const res = await POST(makeReq("POST", rest));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid maturity_date format", async () => {
    const res = await POST(makeReq("POST", { ...VALID_TD, maturity_date: "01/06/2027" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for rate_bps exceeding 5000", async () => {
    const res = await POST(makeReq("POST", { ...VALID_TD, rate_bps: 9999 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for zero principal", async () => {
    const res = await POST(makeReq("POST", { ...VALID_TD, principal_cents: 0 }));
    expect(res.status).toBe(400);
  });

  it("defaults notes to empty string when omitted", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const { notes: _, ...rest } = VALID_TD;
    const created = { id: 2, ...rest, notes: "", user_id: USER.id };
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: created, error: null }),
      }),
    });
    mockFrom.mockReturnValueOnce({ insert: insertSpy });
    const res = await POST(makeReq("POST", rest));
    expect(res.status).toBe(201);
    const insertArg = insertSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg.notes).toBe("");
  });

  it("returns 500 on insert DB error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: null, error: { message: "db error" } }));
    const res = await POST(makeReq("POST", VALID_TD));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/account/term-deposits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { id: 1, rate_bps: 520 }));
    expect(res.status).toBe(401);
  });

  it("updates a TD and returns 200", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const updated = { id: 1, ...VALID_TD, rate_bps: 520 };
    mockFrom.mockReturnValueOnce(makeUpdateChain({ data: updated, error: null }));
    const res = await PATCH(makeReq("PATCH", { id: 1, rate_bps: 520 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { item: unknown };
    expect(body.item).toEqual(updated);
  });

  it("returns 400 for missing id", async () => {
    const res = await PATCH(makeReq("PATCH", { rate_bps: 520 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no row returned", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeUpdateChain({ data: null, error: null }));
    const res = await PATCH(makeReq("PATCH", { id: 99 }));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/account/term-deposits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("deletes a TD and returns ok:true", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeDeleteChain({ error: null }));
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 400 for missing id", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-integer id", async () => {
    const res = await DELETE(makeReq("DELETE", { id: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeDeleteChain({ error: { message: "constraint" } }));
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(500);
  });
});

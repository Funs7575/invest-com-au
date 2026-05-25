import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

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

import { GET, POST, PATCH } from "@/app/api/account/business/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER = { id: "user-uuid-1", email: "owner@example.com" };

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/business", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// GET path: .from().select().eq().maybeSingle()
function makeMaybeSingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

// POST path: .from().upsert().select().single()
function makeUpsertChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.upsert = vi.fn(() => c);
  c.select = vi.fn(() => c);
  c.single = vi.fn().mockResolvedValue(result);
  return c;
}

// PATCH path: .from().update().eq().select().single()
function makeUpdateChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.select = vi.fn(() => c);
  c.single = vi.fn().mockResolvedValue(result);
  return c;
}

const VALID_BODY = {
  business_name: "Acme Pty Ltd",
  abn: "12345678901",
  primary_state: "NSW",
  employees_band: "5-19",
  revenue_band: "75k_2m",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/account/business", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the account row when present", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const account = { id: 1, business_name: "Acme Pty Ltd", status: "pending" };
    mockFrom.mockReturnValueOnce(makeMaybeSingleChain({ data: account, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ account });
  });

  it("returns account: null when no row exists", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeMaybeSingleChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ account: null });
  });

  it("returns 500 when the read errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeMaybeSingleChain({ data: null, error: { message: "boom" } }));
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("fetch_failed");
  });
});

describe("POST /api/account/business", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/account/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when business_name is missing", async () => {
    const { business_name: _omit, ...rest } = VALID_BODY;
    const res = await POST(makeReq("POST", rest));
    expect(res.status).toBe(400);
  });

  it("returns 400 when abn is malformed (not 11 digits)", async () => {
    const res = await POST(makeReq("POST", { ...VALID_BODY, abn: "12" }));
    expect(res.status).toBe(400);
  });

  it("upserts and returns the account with 201", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const created = { id: 7, business_name: "Acme Pty Ltd", status: "pending" };
    const chain = makeUpsertChain({ data: created, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ account: created });
    const upsertArg = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Record<string, unknown>;
    expect(upsertArg).toMatchObject({ auth_user_id: USER.id, status: "pending", business_name: "Acme Pty Ltd" });
  });

  it("normalises empty-string fields to null before upsert", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeUpsertChain({ data: { id: 1 }, error: null });
    mockFrom.mockReturnValueOnce(chain);
    await POST(makeReq("POST", { business_name: "X Co", abn: "", primary_state: "" }));
    const upsertArg = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Record<string, unknown>;
    expect(upsertArg.abn).toBeNull();
    expect(upsertArg.primary_state).toBeNull();
  });

  it("returns 500 when the upsert errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeUpsertChain({ data: null, error: { message: "boom" } }));
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("insert_failed");
  });
});

describe("PATCH /api/account/business", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { business_name: "New Name" }));
    expect(res.status).toBe(401);
  });

  it("updates a subset of fields and echoes the account", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const updated = { id: 7, business_name: "New Name" };
    const chain = makeUpdateChain({ data: updated, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await PATCH(makeReq("PATCH", { business_name: "New Name" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ account: updated });
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Record<string, unknown>;
    expect(updateArg.business_name).toBe("New Name");
    expect(updateArg.updated_at).toBeDefined();
  });

  it("returns 500 when the update errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeUpdateChain({ data: null, error: { message: "boom" } }));
    const res = await PATCH(makeReq("PATCH", { business_name: "New Name" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("update_failed");
  });
});

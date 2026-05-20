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

import { GET, POST, PATCH, DELETE } from "@/app/api/account/goals/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

const VALID_GOAL = {
  label: "House deposit",
  goal_type: "house_deposit",
  target_cents: 5000000,
  target_date: "2030-01-01",
  current_balance_cents: 1000000,
  monthly_contribution_cents: 200000,
  expected_return_pct: 6.5,
  notes: "save save save",
};

function makeReq(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/goals", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// GET chain: from().select().order() — order() resolves the query.
function makeGetChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

// POST chain: from().insert().select().single()
function makeInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

// PATCH chain: from().update().eq().select().single()
function makeUpdateChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

// DELETE chain: from().delete().eq() — eq() resolves the query.
function makeDeleteChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("GET /api/account/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns the user's goals", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const items = [{ id: 1, label: "House deposit" }];
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

  it("returns 500 when the read errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeGetChain({ data: null, error: { message: "boom" } }));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "fetch_failed" });
  });
});

describe("POST /api/account/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq("POST", VALID_GOAL));
    expect(res.status).toBe(401);
  });

  it("inserts the goal scoped to the user and returns 201", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const created = { id: 7, ...VALID_GOAL };
    const chain = makeInsertChain({ data: created, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(makeReq("POST", VALID_GOAL));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ item: created });
    expect(chain.insert).toHaveBeenCalledOnce();
    const insertArgs = chain.insert.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(insertArgs[0]).toMatchObject({ auth_user_id: USER.id, label: "House deposit" });
  });

  it("rejects an invalid body via the validation wrapper", async () => {
    // Validation 400s before the handler runs, so getUser is never consulted.
    const res = await POST(makeReq("POST", { ...VALID_GOAL, goal_type: "not_a_goal" }));
    expect(res.status).toBe(400);
  });

  it("rejects a body with a malformed target_date", async () => {
    const res = await POST(makeReq("POST", { ...VALID_GOAL, target_date: "01/01/2030" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the insert errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: null, error: { message: "boom" } }));
    const res = await POST(makeReq("POST", VALID_GOAL));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "insert_failed", detail: "boom" });
  });
});

describe("PATCH /api/account/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { id: 1, label: "Renamed" }));
    expect(res.status).toBe(401);
  });

  it("updates the goal and returns the row", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const updated = { id: 1, label: "Renamed" };
    const chain = makeUpdateChain({ data: updated, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await PATCH(makeReq("PATCH", { id: 1, label: "Renamed" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ item: updated });
    expect(chain.eq).toHaveBeenCalledWith("id", 1);
    const updateArgs = chain.update.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(updateArgs[0]).toMatchObject({ label: "Renamed" });
    expect(updateArgs[0]).toHaveProperty("updated_at");
    // id should not be written into the update payload.
    expect(updateArgs[0]).not.toHaveProperty("id");
  });

  it("rejects a body missing a valid id", async () => {
    const res = await PATCH(makeReq("PATCH", { label: "Renamed" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the update errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeUpdateChain({ data: null, error: { message: "boom" } }));
    const res = await PATCH(makeReq("PATCH", { id: 1, label: "Renamed" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "update_failed", detail: "boom" });
  });
});

describe("DELETE /api/account/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("deletes the goal and returns ok", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeDeleteChain({ error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await DELETE(makeReq("DELETE", { id: 9 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(chain.eq).toHaveBeenCalledWith("id", 9);
  });

  it("rejects a body missing a valid id", async () => {
    const res = await DELETE(makeReq("DELETE", { id: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the delete errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeDeleteChain({ error: { message: "boom" } }));
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "delete_failed" });
  });
});

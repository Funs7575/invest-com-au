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

const USER = { id: "user-uuid-goals-1", email: "alice@example.com" };

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/goals", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const GOAL_SEED = {
  id: 1,
  auth_user_id: USER.id,
  label: "House deposit",
  goal_type: "house_deposit",
  target_cents: 10000000,
  target_date: "2028-06-01",
  current_balance_cents: 2000000,
  monthly_contribution_cents: 300000,
  expected_return_pct: "5.50",
  notes: null,
  created_at: "2026-05-20T00:00:00Z",
  updated_at: "2026-05-20T00:00:00Z",
};

function makeSelectChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "order", "single", "maybeSingle"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(result)),
      })),
    })),
  };
}

function makeDeleteChain(result: { error: unknown }) {
  return {
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve(result)),
    })),
  };
}

describe("GET /api/account/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns goal list with 200", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: [GOAL_SEED], error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[] };
    expect(body.items).toHaveLength(1);
  });

  it("returns 500 on DB error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(
      makeSelectChain({ data: null, error: { message: "db error" } }),
    );
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/account/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq("POST", {
      label: "Test",
      goal_type: "generic",
      target_cents: 500000,
      target_date: "2030-01-01",
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid input (missing required field)", async () => {
    const res = await POST(makeReq("POST", { goal_type: "generic" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown goal_type", async () => {
    const res = await POST(makeReq("POST", {
      label: "Test",
      goal_type: "invalid_type",
      target_cents: 100000,
      target_date: "2030-01-01",
    }));
    expect(res.status).toBe(400);
  });

  it("accepts fire and debt_free goal types", async () => {
    for (const goal_type of ["fire", "debt_free"] as const) {
      mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
      mockFrom.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { ...GOAL_SEED, goal_type }, error: null })),
          })),
        })),
      });
      const res = await POST(makeReq("POST", {
        label: "Goal",
        goal_type,
        target_cents: 1000000,
        target_date: "2035-01-01",
      }));
      expect(res.status).toBe(201);
    }
  });

  it("creates goal and returns 201", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: GOAL_SEED, error: null }));
    const res = await POST(makeReq("POST", {
      label: "House deposit",
      goal_type: "house_deposit",
      target_cents: 10000000,
      target_date: "2028-06-01",
    }));
    expect(res.status).toBe(201);
    const body = await res.json() as { item: { label: string } };
    expect(body.item.label).toBe("House deposit");
  });
});

describe("DELETE /api/account/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("deletes goal and returns 200", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeDeleteChain({ error: null }));
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 400 on missing id", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/account/goals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { id: 1, label: "Updated" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on missing id", async () => {
    const res = await PATCH(makeReq("PATCH", { label: "No id" }));
    expect(res.status).toBe(400);
  });
});

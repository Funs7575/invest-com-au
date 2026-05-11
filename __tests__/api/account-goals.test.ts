import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { GET, POST, PATCH, DELETE } from "@/app/api/account/goals/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function jsonRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest("http://localhost/api/account/goals", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Build a Supabase QueryBuilder-shaped chain. All terminal methods that the
 * route uses (`order`, `single`) resolve to `result`; intermediate methods
 * (`select`, `insert`, `update`, `delete`, `eq`) are fluent.
 */
function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "update", "delete", "eq"]) {
    c[m] = vi.fn(() => c);
  }
  c.order = vi.fn(() => Promise.resolve(result));
  c.single = vi.fn(() => Promise.resolve(result));
  return c;
}

const VALID_BODY = {
  label: "House deposit",
  goal_type: "home",
  target_cents: 50_000_00,
  target_date: "2030-12-31",
  current_balance_cents: 10_000_00,
  monthly_contribution_cents: 500_00,
  expected_return_pct: 6,
  notes: null,
};

describe("GET /api/account/goals", () => {
  beforeEach(() => {
    // Use mockReset (not clearAllMocks) so leftover mockResolvedValueOnce
    // queues from validation-failure tests don't leak into later auth checks.
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's goals on success", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const items = [{ id: 1, label: "House", target_cents: 100_000_00 }];
    mockFrom.mockReturnValue(makeChain({ data: items, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).items).toEqual(items);
  });

  it("returns 500 when the query errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "boom" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/account/goals", () => {
  beforeEach(() => {
    // Use mockReset (not clearAllMocks) so leftover mockResolvedValueOnce
    // queues from validation-failure tests don't leak into later auth checks.
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(jsonRequest("POST", VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 on missing label", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(jsonRequest("POST", { ...VALID_BODY, label: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid date format", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(
      jsonRequest("POST", { ...VALID_BODY, target_date: "31/12/2030" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on non-positive target", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(jsonRequest("POST", { ...VALID_BODY, target_cents: 0 }));
    expect(res.status).toBe(400);
  });

  it("inserts a goal scoped to the authenticated user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({
      data: { id: 7, ...VALID_BODY, created_at: "x", updated_at: "x" },
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const res = await POST(jsonRequest("POST", VALID_BODY));
    expect(res.status).toBe(201);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_user_id: USER.id,
        label: VALID_BODY.label,
        goal_type: VALID_BODY.goal_type,
        target_cents: VALID_BODY.target_cents,
        target_date: VALID_BODY.target_date,
        current_balance_cents: VALID_BODY.current_balance_cents,
        monthly_contribution_cents: VALID_BODY.monthly_contribution_cents,
        expected_return_pct: VALID_BODY.expected_return_pct,
      }),
    );
  });

  it("returns 500 when the insert errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "constraint" } }));
    const res = await POST(jsonRequest("POST", VALID_BODY));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/account/goals", () => {
  beforeEach(() => {
    // Use mockReset (not clearAllMocks) so leftover mockResolvedValueOnce
    // queues from validation-failure tests don't leak into later auth checks.
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(jsonRequest("PATCH", { id: 1, label: "new" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PATCH(jsonRequest("PATCH", { label: "renamed" }));
    expect(res.status).toBe(400);
  });

  it("updates the goal and scopes by id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({ data: { id: 7 }, error: null });
    mockFrom.mockReturnValue(chain);
    const res = await PATCH(
      jsonRequest("PATCH", { id: 7, label: "Renamed", monthly_contribution_cents: 1000_00 }),
    );
    expect(res.status).toBe(200);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Renamed",
        monthly_contribution_cents: 1000_00,
      }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", 7);
  });
});

describe("DELETE /api/account/goals", () => {
  beforeEach(() => {
    // Use mockReset (not clearAllMocks) so leftover mockResolvedValueOnce
    // queues from validation-failure tests don't leak into later auth checks.
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(jsonRequest("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await DELETE(jsonRequest("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("deletes the goal scoped by id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    // DELETE's terminal `await` is on the eq(...) chain return, not single().
    // Make eq itself resolve to the result.
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.delete = vi.fn(() => chain);
    chain.eq = vi.fn(() => Promise.resolve({ data: null, error: null }));
    mockFrom.mockReturnValue(chain);
    const res = await DELETE(jsonRequest("DELETE", { id: 7 }));
    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("id", 7);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireOrgSession, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 5, role: "admin", userId: "user-org-5" }),
  ),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: () => mockRequireOrgSession(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "like", "head",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

const SESSION = { organisationId: 5, role: "admin", userId: "user-org-5" };

// ── Route under test ──────────────────────────────────────────────────────────
import { GET } from "@/app/api/org-auth/dashboard/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/org-auth/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns 500 when the courses query fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "courses boom" } }));
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to load dashboard/i);
  });

  it("returns zeroed stats when org has no published courses", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrollments_this_month).toBe(0);
    expect(body.revenue_this_month_cents).toBe(0);
    expect(body.total_enrollments).toBe(0);
    expect(body.total_revenue_cents).toBe(0);
    expect(body.active_courses).toBe(0);
    expect(body.cpd_hours_issued).toBe(0);
  });

  it("returns zeroed stats when courses returns null", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.active_courses).toBe(0);
  });

  it("returns 500 when purchases query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: [{ id: 10 }], error: null });
      return makeChain({ data: null, error: { message: "purchases boom" } });
    });
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to load dashboard/i);
  });

  it("returns correct stats with purchases but no CPD data", async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();
    const purchases = [
      { id: 1, amount_cents: 5000, purchased_at: thisMonth, course_id: 10 },
      { id: 2, amount_cents: 3000, purchased_at: thisMonth, course_id: 10 },
      { id: 3, amount_cents: 2000, purchased_at: lastMonth, course_id: 10 },
    ];
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: [{ id: 10 }], error: null });
      if (call === 2) return makeChain({ data: purchases, error: null });
      return makeChain({ data: null, error: null }); // CPD query returns null — graceful
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_enrollments).toBe(3);
    expect(body.total_revenue_cents).toBe(10000);
    expect(body.enrollments_this_month).toBe(2);
    expect(body.revenue_this_month_cents).toBe(8000);
    expect(body.active_courses).toBe(1);
    expect(body.cpd_hours_issued).toBe(0);
  });

  it("sums CPD hours correctly", async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
    const purchases = [
      { id: 1, amount_cents: 5000, purchased_at: thisMonth, course_id: 10 },
    ];
    const cpdData = [
      { hours_earned: 3.5, course_id: 10 },
      { hours_earned: 1.5, course_id: 10 },
      { hours_earned: null, course_id: 10 }, // null should be treated as 0
    ];
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: [{ id: 10 }, { id: 11 }], error: null });
      if (call === 2) return makeChain({ data: purchases, error: null });
      return makeChain({ data: cpdData, error: null });
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cpd_hours_issued).toBe(5);
    expect(body.active_courses).toBe(2);
  });

  it("returns 200 with cpd_hours_issued=0 when CPD query fails (non-fatal)", async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
    const purchases = [
      { id: 1, amount_cents: 1000, purchased_at: thisMonth, course_id: 10 },
    ];
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: [{ id: 10 }], error: null });
      if (call === 2) return makeChain({ data: purchases, error: null });
      // CPD query fails — should warn but not fail the response
      return makeChain({ data: null, error: { message: "cpd boom" } });
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cpd_hours_issued).toBe(0);
    expect(body.total_enrollments).toBe(1);
  });

  it("returns 200 with empty purchases returning zeroed this-month stats", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: [{ id: 10 }, { id: 11 }], error: null });
      if (call === 2) return makeChain({ data: [], error: null });
      return makeChain({ data: [], error: null });
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_enrollments).toBe(0);
    expect(body.enrollments_this_month).toBe(0);
    expect(body.active_courses).toBe(2);
  });
});

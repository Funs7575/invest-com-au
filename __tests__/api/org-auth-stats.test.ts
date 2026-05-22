import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsRateLimited = vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false);
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockRequireOrgSession = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  organisationId: 7,
  role: "admin",
  userId: "user-org-1",
}));
vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: (...args: unknown[]) => mockRequireOrgSession(...args),
}));

// Chain builder — each method returns the same chain; awaiting resolves res.
function makeChain(res: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "maybeSingle", "single", "like", "filter",
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

const mockAdminFrom = vi.fn(() => makeChain());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/org-auth/stats/route";

// ── Request helpers ───────────────────────────────────────────────────────────

function makeGet(ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/org-auth/stats", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

// ── Sample data ───────────────────────────────────────────────────────────────

const now = new Date();
const thisMonth = new Date(now.getFullYear(), now.getMonth(), 2).toISOString();
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();

const sampleCourses = [
  { id: 10, title: "Intro to Investing" },
  { id: 11, title: "Advanced ETFs" },
];

const samplePurchases = [
  { id: 1, user_id: "u-a", course_id: 10, purchased_at: thisMonth, amount_cents: 4900, status: "paid" },
  { id: 2, user_id: "u-b", course_id: 11, purchased_at: lastMonth, amount_cents: 9900, status: "paid" },
];

const sampleCpdData = [
  { hours_earned: 2.5, course_id: 10 },
  { hours_earned: 1.0, course_id: 11 },
];

const sampleProfiles = [
  { auth_user_id: "u-a", display_name: "Alice" },
  { auth_user_id: "u-b", display_name: "Bob" },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/org-auth/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue({
      organisationId: 7,
      role: "admin",
      userId: "user-org-1",
    });
  });

  // ── Auth guard ──────────────────────────────────────────────────────────────

  it("returns 401 when requireOrgSession throws an unauth Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  // ── Rate limiting ───────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("Too many requests");
  });

  // ── DB error on courses fetch → 500 ────────────────────────────────────────

  it("returns 500 when courses query fails", async () => {
    mockAdminFrom.mockImplementation(() =>
      makeChain({ data: null, error: { message: "db error" } }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to load stats");
  });

  // ── No published courses → zeroed stats early return ───────────────────────

  it("returns zeroed stats when org has no published courses", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        // empty courses — triggers the early-return path
        return makeChain({ data: [], error: null });
      }
      if (table === "organisation_members") {
        // team count query
        return makeChain({ data: null, error: null, count: 3 });
      }
      return makeChain();
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats).toEqual({
      enrollments_this_month: 0,
      revenue_this_month_cents: 0,
      total_enrollments: 0,
      total_revenue_cents: 0,
      active_courses: 0,
      cpd_hours_issued: 0,
      team_member_count: 3,
    });
    expect(json.recent_enrollments).toEqual([]);
  });

  it("returns zeroed stats with team_member_count=0 when member count query returns null", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: [], error: null });
      if (table === "organisation_members") return makeChain({ data: null, error: null, count: null });
      return makeChain();
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats.team_member_count).toBe(0);
  });

  // ── Happy path with courses ─────────────────────────────────────────────────

  it("returns aggregated stats and recent enrollments for org with courses", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        return makeChain({ data: sampleCourses, error: null });
      }
      if (table === "course_purchases") {
        return makeChain({ data: samplePurchases, error: null });
      }
      if (table === "cpd_credits") {
        return makeChain({ data: sampleCpdData, error: null });
      }
      if (table === "organisation_members") {
        return makeChain({ data: null, error: null, count: 5 });
      }
      if (table === "investor_profiles") {
        return makeChain({ data: sampleProfiles, error: null });
      }
      return makeChain();
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();

    // Both purchases are in result; only the thisMonth one contributes to monthly
    expect(json.stats.total_enrollments).toBe(2);
    expect(json.stats.total_revenue_cents).toBe(4900 + 9900);
    expect(json.stats.enrollments_this_month).toBe(1);
    expect(json.stats.revenue_this_month_cents).toBe(4900);
    expect(json.stats.active_courses).toBe(2);
    expect(json.stats.cpd_hours_issued).toBe(3.5);
    expect(json.stats.team_member_count).toBe(5);

    // recent_enrollments are mapped correctly
    expect(json.recent_enrollments).toHaveLength(2);
    expect(json.recent_enrollments[0]).toMatchObject({
      user_name: "Alice",
      course_title: "Intro to Investing",
      amount_cents: 4900,
    });
    expect(json.recent_enrollments[1]).toMatchObject({
      user_name: "Bob",
      course_title: "Advanced ETFs",
      amount_cents: 9900,
    });
  });

  // ── With courses but no purchases ──────────────────────────────────────────

  it("returns zero revenue when no purchases exist for org courses", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: sampleCourses, error: null });
      if (table === "course_purchases") return makeChain({ data: [], error: null });
      if (table === "cpd_credits") return makeChain({ data: [], error: null });
      if (table === "organisation_members") return makeChain({ data: null, error: null, count: 2 });
      // investor_profiles query won't fire (no recent purchases → no user ids)
      return makeChain();
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats.total_enrollments).toBe(0);
    expect(json.stats.total_revenue_cents).toBe(0);
    expect(json.stats.enrollments_this_month).toBe(0);
    expect(json.stats.revenue_this_month_cents).toBe(0);
    expect(json.recent_enrollments).toEqual([]);
  });

  // ── Purchases fetch error → 500 ─────────────────────────────────────────────

  it("returns 500 when course_purchases query fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: sampleCourses, error: null });
      if (table === "course_purchases") {
        return makeChain({ data: null, error: { message: "purchases db error" } });
      }
      return makeChain();
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to load stats");
  });

  // ── CPD error is non-fatal (warn, not 500) ──────────────────────────────────

  it("still returns 200 when cpd_credits query fails (non-fatal warn path)", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: sampleCourses, error: null });
      if (table === "course_purchases") return makeChain({ data: samplePurchases, error: null });
      if (table === "cpd_credits") {
        return makeChain({ data: null, error: { message: "cpd error" } });
      }
      if (table === "organisation_members") return makeChain({ data: null, error: null, count: 1 });
      if (table === "investor_profiles") return makeChain({ data: sampleProfiles, error: null });
      return makeChain();
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    // CPD error → hours default to 0
    expect(json.stats.cpd_hours_issued).toBe(0);
  });

  // ── Fallback display_name when profiles query returns nothing ───────────────

  it("uses 'Student' fallback when investor_profiles query returns null data", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: sampleCourses, error: null });
      if (table === "course_purchases") return makeChain({ data: samplePurchases, error: null });
      if (table === "cpd_credits") return makeChain({ data: [], error: null });
      if (table === "organisation_members") return makeChain({ data: null, error: null, count: 0 });
      if (table === "investor_profiles") return makeChain({ data: null, error: { message: "profiles err" } });
      return makeChain();
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    for (const enrollment of json.recent_enrollments as Array<{ user_name: string }>) {
      expect(enrollment.user_name).toBe("Student");
    }
  });
});

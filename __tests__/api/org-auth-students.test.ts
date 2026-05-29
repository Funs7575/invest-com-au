import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireOrgSession, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 5, role: "admin", userId: "user-org-5" }),
  ),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
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

function makeReq(ip = "1.2.3.4"): NextRequest {
  return new Request("http://localhost/api/org-auth/students", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  }) as unknown as NextRequest;
}

const SESSION = { organisationId: 5, role: "admin", userId: "user-org-5" };

const ORG_COURSES = [
  { id: 10, slug: "intro-investing", title: "Intro to Investing" },
  { id: 11, slug: "advanced-etfs", title: "Advanced ETFs" },
];

const PURCHASES = [
  { user_id: "user-a", course_id: 10, purchased_at: "2026-05-10T00:00:00Z" },
  { user_id: "user-b", course_id: 11, purchased_at: "2026-05-09T00:00:00Z" },
];

const PROFILES = [
  { auth_user_id: "user-a", display_name: "Alice" },
  { auth_user_id: "user-b", display_name: "Bob" },
];

// ── Route under test ──────────────────────────────────────────────────────────
import { GET } from "@/app/api/org-auth/students/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/org-auth/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 500 when courses query fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "courses boom" } }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to load students/i);
  });

  it("returns empty students array when org has no courses", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toEqual([]);
  });

  it("returns empty students array when courses returns null", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect((await res.json()).students).toEqual([]);
  });

  it("returns 500 when purchases query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_COURSES, error: null });
      return makeChain({ data: null, error: { message: "purchases boom" } });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to load students/i);
  });

  it("returns empty students array when no paid purchases exist", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_COURSES, error: null });
      return makeChain({ data: [], error: null });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect((await res.json()).students).toEqual([]);
  });

  it("returns students with display names when profiles exist", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_COURSES, error: null });
      if (call === 2) return makeChain({ data: PURCHASES, error: null });
      return makeChain({ data: PROFILES, error: null });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toHaveLength(2);
    const alice = body.students.find((s: { user_id: string }) => s.user_id === "user-a");
    expect(alice.user_name).toBe("Alice");
    expect(alice.course_title).toBe("Intro to Investing");
    expect(alice.completion_pct).toBe(0);
    expect(alice.has_certificate).toBe(false);
  });

  it("falls back to user_id as display name when profile is missing", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_COURSES, error: null });
      if (call === 2) return makeChain({ data: [PURCHASES[0]], error: null });
      // profiles query fails — non-fatal, user_id used as fallback
      return makeChain({ data: null, error: { message: "profiles boom" } });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toHaveLength(1);
    expect(body.students[0].user_name).toBe("user-a"); // fallback to user_id
  });

  it("returns 'Unknown' course title when course_id is null in a purchase", async () => {
    const purchaseNullCourse = { user_id: "user-c", course_id: null, purchased_at: "2026-05-08T00:00:00Z" };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_COURSES, error: null });
      if (call === 2) return makeChain({ data: [purchaseNullCourse], error: null });
      return makeChain({ data: [], error: null });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students[0].course_title).toBe("Unknown");
  });

  it("deduplicates user IDs when the same user bought multiple courses", async () => {
    const multiPurchases = [
      { user_id: "user-a", course_id: 10, purchased_at: "2026-05-10T00:00:00Z" },
      { user_id: "user-a", course_id: 11, purchased_at: "2026-05-09T00:00:00Z" },
    ];
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_COURSES, error: null });
      if (call === 2) return makeChain({ data: multiPurchases, error: null });
      return makeChain({ data: [{ auth_user_id: "user-a", display_name: "Alice" }], error: null });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // Two purchases → two student rows (one per enrollment)
    expect(body.students).toHaveLength(2);
    // But both should resolve the same display name
    expect(body.students[0].user_name).toBe("Alice");
    expect(body.students[1].user_name).toBe("Alice");
  });
});

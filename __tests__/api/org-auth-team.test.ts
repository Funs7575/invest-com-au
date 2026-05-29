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

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

function makeReq(ip = "1.2.3.4"): NextRequest {
  return new Request("http://localhost/api/org-auth/team", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  }) as unknown as NextRequest;
}

const SESSION = { organisationId: 5, role: "admin", userId: "user-org-5" };

const SAMPLE_MEMBER = {
  id: 1,
  organisation_id: 5,
  user_id: "user-org-5",
  invited_email: "alice@example.com",
  role: "admin",
  status: "active",
  invited_at: "2026-01-01T00:00:00Z",
  accepted_at: "2026-01-02T00:00:00Z",
};

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET } from "@/app/api/org-auth/team/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/org-auth/team
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/org-auth/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("passes the correct rate-limit key (IP-based)", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await GET(makeReq("9.8.7.6"));
    expect(mockIsRateLimited).toHaveBeenCalledWith("org_team_get:9.8.7.6", 20, 1);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected crash"));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/internal server error/i);
  });

  it("returns 500 when the DB query fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "db boom" } }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to load team/i);
  });

  it("returns 200 with empty members array when org has no members", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toEqual([]);
  });

  it("returns 200 with members array on success", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [SAMPLE_MEMBER], error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toHaveLength(1);
    expect(body.members[0].invited_email).toBe("alice@example.com");
    expect(body.members[0].role).toBe("admin");
  });

  it("returns 200 with all members when multiple exist", async () => {
    const members = [
      { ...SAMPLE_MEMBER, id: 1, invited_email: "alice@example.com" },
      { ...SAMPLE_MEMBER, id: 2, invited_email: "bob@example.com", role: "member" },
    ];
    mockAdminFrom.mockReturnValue(makeChain({ data: members, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toHaveLength(2);
  });

  it("queries the correct organisation_id from the session", async () => {
    const chain = makeChain({ data: [], error: null });
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq());
    // eq should have been called with organisation_id = 5 from the session
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    expect(eqFn).toHaveBeenCalledWith("organisation_id", SESSION.organisationId);
  });
});

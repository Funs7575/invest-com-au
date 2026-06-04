import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs (must use vi.hoisted so they're available inside vi.mock factories) ──

const { mockIsRateLimited, mockRequireOrgSession, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<() => Promise<boolean>>(async () => false),
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 7, role: "admin", userId: "user-org-1" }),
  ),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: mockRequireOrgSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "maybeSingle", "single", "like",
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

function makeGet(ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/org-auth/team", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

// ── Route under test (imported after all mocks) ─────────────────────────────

import { GET } from "@/app/api/org-auth/team/route";

describe("GET /api/org-auth/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue({ organisationId: 7, role: "admin", userId: "user-org-1" });
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }));
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("Too many requests");
  });

  it("returns 401 when requireOrgSession throws an unauth Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("boom"));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Internal server error");
  });

  it("returns 500 when the members query fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "db error" } }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to load team");
  });

  it("returns 200 with members array on success", async () => {
    const members = [
      { id: 1, organisation_id: 7, user_id: "u-a", invited_email: "a@x.com", role: "admin", status: "active" },
      { id: 2, organisation_id: 7, user_id: null, invited_email: "b@x.com", role: "editor", status: "invited" },
    ];
    mockAdminFrom.mockReturnValue(makeChain({ data: members, error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.members).toHaveLength(2);
    expect(json.members[0]?.role).toBe("admin");
  });

  it("returns 200 with empty array when members data is null", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.members).toEqual([]);
  });

  it("uses 'unknown' ip when x-forwarded-for header missing", async () => {
    const req = new NextRequest("http://localhost/api/org-auth/team", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockIsRateLimited).toHaveBeenCalledWith("org_team_get:unknown", 20, 1);
  });
});

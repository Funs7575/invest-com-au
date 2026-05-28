import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsRateLimited, mockRequireOrgSession, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<() => Promise<boolean>>(async () => false),
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 7, role: "admin", userId: "user-org-1" }),
  ),
  mockAdminFrom: vi.fn((_table: string) => makeChain()),
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

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "maybeSingle", "single", "like",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

function makeGet(ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/org-auth/students", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

const sampleCourses = [
  { id: 10, slug: "intro", title: "Intro to Investing" },
  { id: 11, slug: "etfs", title: "Advanced ETFs" },
];

const samplePurchases = [
  { user_id: "u-a", course_id: 10, purchased_at: "2026-05-01T00:00:00Z" },
  { user_id: "u-b", course_id: 11, purchased_at: "2026-04-01T00:00:00Z" },
];

const sampleProfiles = [
  { auth_user_id: "u-a", display_name: "Alice" },
];

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/org-auth/students/route";

describe("GET /api/org-auth/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue({ organisationId: 7, role: "admin", userId: "user-org-1" });
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when requireOrgSession throws a Response", async () => {
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
  });

  it("returns 500 when the courses query fails", async () => {
    mockAdminFrom.mockImplementation(() => makeChain({ data: null, error: { message: "db error" } }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to load students");
  });

  it("returns empty students array when org has no courses", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: [], error: null });
      return makeChain();
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.students).toEqual([]);
  });

  it("returns 500 when the purchases query fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: sampleCourses, error: null });
      if (table === "course_purchases") return makeChain({ data: null, error: { message: "db error" } });
      return makeChain();
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to load students");
  });

  it("returns empty students array when there are no paid purchases", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: sampleCourses, error: null });
      if (table === "course_purchases") return makeChain({ data: [], error: null });
      return makeChain();
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.students).toEqual([]);
  });

  it("assembles students with display names and course titles", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: sampleCourses, error: null });
      if (table === "course_purchases") return makeChain({ data: samplePurchases, error: null });
      if (table === "investor_profiles") return makeChain({ data: sampleProfiles, error: null });
      return makeChain();
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.students).toHaveLength(2);
    expect(json.students[0]).toMatchObject({
      user_id: "u-a",
      user_name: "Alice",
      course_id: 10,
      course_title: "Intro to Investing",
    });
    // No profile for u-b → falls back to user_id
    expect(json.students[1]).toMatchObject({ user_id: "u-b", user_name: "u-b" });
  });

  it("still returns 200 when investor_profiles query errors (non-fatal)", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") return makeChain({ data: sampleCourses, error: null });
      if (table === "course_purchases") return makeChain({ data: samplePurchases, error: null });
      if (table === "investor_profiles") return makeChain({ data: null, error: { message: "profiles err" } });
      return makeChain();
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    // names fall back to user_id when no profiles resolved
    expect(json.students[0]?.user_name).toBe("u-a");
  });
});

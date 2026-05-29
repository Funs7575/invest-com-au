import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ── Supabase admin builder ────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve({ data, error }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/advisor-auth/badges/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 77;

const MOCK_BADGES = [
  { id: 1, professional_id: ADVISOR_ID, badge_type: "top_rated", earned_at: "2026-01-15" },
  { id: 2, professional_id: ADVISOR_ID, badge_type: "quick_responder", earned_at: "2026-02-20" },
];

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/badges", {
    method: "GET",
    headers: { "x-forwarded-for": "5.6.7.8" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    // Default: badges returned successfully
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(MOCK_BADGES, null));
  });

  // ── 429 rate limiting ─────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many requests/i);
  });

  // ── 401 unauthenticated ───────────────────────────────────────────────────

  it("returns 401 when advisor session is not found", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── 200 with badges ───────────────────────────────────────────────────────

  it("returns 200 with badges array", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.badges).toHaveLength(2);
    expect(json.badges[0]).toMatchObject({ badge_type: "top_rated" });
  });

  // ── 200 with empty badges array ───────────────────────────────────────────

  it("returns 200 with empty badges array when none exist", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.badges).toEqual([]);
  });

  // ── 500 DB error ──────────────────────────────────────────────────────────

  it("returns 500 when DB query fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "relation does not exist" }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to fetch badges/i);
  });

  // ── 500 on thrown error ───────────────────────────────────────────────────

  it("returns 500 when an unexpected error is thrown", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("connection pool exhausted");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to fetch badges/i);
  });

  // ── scoping: uses advisor's professional_id in the query ─────────────────

  it("passes the advisor professional_id to the eq filter", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    // Verify mockFrom was called (i.e., the admin client was used to scope query)
    expect(mockFrom).toHaveBeenCalled();
    const builder = mockFrom.mock.results[0]?.value as Record<string, ReturnType<typeof vi.fn>>;
    expect(builder).toBeDefined();
    expect((builder.eq as ReturnType<typeof vi.fn>).mock.calls.some(
      (c: unknown[]) => c[0] === "professional_id" && c[1] === ADVISOR_ID,
    )).toBe(true);
  });
});

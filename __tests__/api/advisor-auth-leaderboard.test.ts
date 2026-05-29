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

function makeBuilder(data: unknown = null, error: unknown = null, count: number | null = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown; count: number | null }) => unknown) =>
      Promise.resolve(r({ data, error, count })),
    count,
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve({ data, error, count }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error, count }));
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/advisor-auth/leaderboard/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 42;

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/leaderboard", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    // Default: advisor has a rank row + total 100 advisors
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // advisor's own rank row
        const b = makeBuilder({ rank: 10, score: 850 }, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { rank: 10, score: 850 },
          error: null,
          count: null,
        });
        return b;
      }
      // count query — return count via the builder
      const b = makeBuilder(null, null, 100);
      return b;
    });
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

  // ── rank: null when advisor has no leaderboard row ────────────────────────

  it("returns { rank: null } when advisor is not on the leaderboard", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: null,
        count: null,
      });
      return b;
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rank).toBeNull();
  });

  // ── happy path: rank + score + total + percentile ─────────────────────────

  it("returns rank, score, total and percentile when advisor is on leaderboard", async () => {
    // Already set in beforeEach (rank=10, total=100)
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rank).toBe(10);
    expect(json.score).toBe(850);
    expect(json.total).toBe(100);
    // percentile = Math.round(((100 - 10) / 100) * 100) = 90
    expect(json.percentile).toBe(90);
  });

  // ── percentile is null when total is 0 ───────────────────────────────────

  it("returns percentile: null when total leaderboard count is 0", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder({ rank: 1, score: 100 }, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { rank: 1, score: 100 },
          error: null,
          count: null,
        });
        return b;
      }
      // count = 0
      return makeBuilder(null, null, 0);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.percentile).toBeNull();
  });

  // ── 500 on unexpected error ───────────────────────────────────────────────

  it("returns 500 when an unexpected error is thrown", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("DB connection refused");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to fetch rank/i);
  });
});

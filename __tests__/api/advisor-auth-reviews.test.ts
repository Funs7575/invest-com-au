import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

// vi.hoisted() — vi.mock factories are hoisted; the captured fn must be too.
const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

import { GET } from "@/app/api/advisor-auth/reviews/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/reviews", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function withReviews(rows: Array<Record<string, unknown>> | null, error: unknown = null) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professional_reviews") {
      // Query terminates on .limit(); resolve it with the supplied rows.
      b.limit = vi.fn(() => Promise.resolve({ data: rows, error }));
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockRequireAdvisorSession.mockResolvedValue(null);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 500 when the reviews query errors", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    withReviews(null, { message: "db error" });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("returns empty stats when there are no reviews", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    withReviews(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reviews).toEqual([]);
    expect(json.stats).toEqual({
      totalReviews: 0,
      pendingReviews: 0,
      avgRating: null,
      trend: null,
    });
  });

  it("computes avg rating, pending count, and an upward trend", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    // 6 approved + 1 pending. Recent 5 avg (5,5,5,5,4 -> 4.8) vs previous (3 -> 3)
    // => trend "up". Overall approved avg = (5+5+5+5+4+3)/6 = 4.5.
    const approved = [5, 5, 5, 5, 4, 3].map((rating, i) => ({
      id: i + 1,
      rating,
      status: "approved",
    }));
    const pending = [{ id: 99, rating: 2, status: "pending" }];
    withReviews([...approved, ...pending]);

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats.totalReviews).toBe(6);
    expect(json.stats.pendingReviews).toBe(1);
    expect(json.stats.avgRating).toBe(4.5);
    expect(json.stats.trend).toBe("up");
    expect(json.reviews).toHaveLength(7);
  });
});

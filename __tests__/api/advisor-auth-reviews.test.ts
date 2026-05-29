import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 30),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn<(...args: unknown[]) => unknown>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/advisor-auth/reviews/route";

// ── Builder helper ────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

type ReviewRow = {
  id: number;
  reviewer_name: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  communication_rating: number | null;
  expertise_rating: number | null;
  value_for_money_rating: number | null;
  status: "approved" | "pending";
};

function makeReview(
  id: number,
  rating: number,
  status: "approved" | "pending" = "approved",
): ReviewRow {
  return {
    id,
    reviewer_name: `Reviewer ${id}`,
    rating,
    title: `Review ${id}`,
    body: "Great advisor",
    created_at: "2025-01-01T00:00:00.000Z",
    communication_rating: rating,
    expertise_rating: rating,
    value_for_money_rating: rating,
    status,
  };
}

function makeGet() {
  return new NextRequest(
    "http://localhost/api/advisor-auth/reviews",
    {
      method: "GET",
      headers: { "x-forwarded-for": "5.5.5.5" },
    },
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/reviews — auth + rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(30);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many requests/i);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not authenticated/i);
  });
});

describe("GET /api/advisor-auth/reviews — DB error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(30);
  });

  it("returns 500 on DB error", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "db down" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/failed to fetch reviews/i);
  });
});

describe("GET /api/advisor-auth/reviews — success: empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(30);
  });

  it("returns empty reviews array and null stats when no reviews exist", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([], null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      reviews: unknown[];
      stats: { totalReviews: number; pendingReviews: number; avgRating: number | null; trend: unknown };
    };
    expect(body.reviews).toEqual([]);
    expect(body.stats.totalReviews).toBe(0);
    expect(body.stats.pendingReviews).toBe(0);
    expect(body.stats.avgRating).toBeNull();
    expect(body.stats.trend).toBeNull();
  });

  it("handles null data from DB gracefully", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as { reviews: unknown[]; stats: { totalReviews: number } };
    expect(body.reviews).toEqual([]);
    expect(body.stats.totalReviews).toBe(0);
  });
});

describe("GET /api/advisor-auth/reviews — success: stats computation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(30);
  });

  it("computes avgRating for approved reviews", async () => {
    const reviews = [
      makeReview(1, 5, "approved"),
      makeReview(2, 3, "approved"),
      makeReview(3, 4, "pending"),
    ];
    mockAdminFrom.mockReturnValue(makeBuilder(reviews, null));

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      stats: { totalReviews: number; pendingReviews: number; avgRating: number | null };
    };
    // 2 approved, avg = (5+3)/2 = 4.0
    expect(body.stats.totalReviews).toBe(2);
    expect(body.stats.pendingReviews).toBe(1);
    expect(body.stats.avgRating).toBe(4.0);
  });

  it("trend is null when fewer than 6 approved reviews", async () => {
    const reviews = [makeReview(1, 5), makeReview(2, 4), makeReview(3, 3)];
    mockAdminFrom.mockReturnValue(makeBuilder(reviews, null));

    const res = await GET(makeGet());
    const body = await res.json() as { stats: { trend: unknown } };
    // < 6 approved → no previousFive → trend is null
    expect(body.stats.trend).toBeNull();
  });

  it("trend is 'up' when recent 5 avg > previous 5 avg by more than 0.1", async () => {
    // 10 approved reviews — recent 5 are 5.0, previous 5 are 3.0
    const reviews = [
      ...Array.from({ length: 5 }, (_, i) => makeReview(i + 1, 5, "approved")),
      ...Array.from({ length: 5 }, (_, i) => makeReview(i + 6, 3, "approved")),
    ];
    mockAdminFrom.mockReturnValue(makeBuilder(reviews, null));

    const res = await GET(makeGet());
    const body = await res.json() as { stats: { trend: string | null } };
    expect(body.stats.trend).toBe("up");
  });

  it("trend is 'down' when recent 5 avg < previous 5 avg by more than 0.1", async () => {
    const reviews = [
      ...Array.from({ length: 5 }, (_, i) => makeReview(i + 1, 3, "approved")),
      ...Array.from({ length: 5 }, (_, i) => makeReview(i + 6, 5, "approved")),
    ];
    mockAdminFrom.mockReturnValue(makeBuilder(reviews, null));

    const res = await GET(makeGet());
    const body = await res.json() as { stats: { trend: string | null } };
    expect(body.stats.trend).toBe("down");
  });

  it("trend is 'flat' when recent and previous 5 avgs are within 0.1", async () => {
    // All identical ratings → difference = 0
    const reviews = Array.from({ length: 10 }, (_, i) => makeReview(i + 1, 4, "approved"));
    mockAdminFrom.mockReturnValue(makeBuilder(reviews, null));

    const res = await GET(makeGet());
    const body = await res.json() as { stats: { trend: string | null } };
    expect(body.stats.trend).toBe("flat");
  });

  it("rounds avgRating to 1 decimal place", async () => {
    // 3 + 4 + 4 = 11 → avg = 3.666... → rounded to 3.7
    const reviews = [makeReview(1, 3), makeReview(2, 4), makeReview(3, 4)];
    mockAdminFrom.mockReturnValue(makeBuilder(reviews, null));

    const res = await GET(makeGet());
    const body = await res.json() as { stats: { avgRating: number | null } };
    expect(body.stats.avgRating).toBe(3.7);
  });

  it("separates approved and pending reviews correctly", async () => {
    const reviews = [
      makeReview(1, 5, "approved"),
      makeReview(2, 4, "pending"),
      makeReview(3, 3, "pending"),
    ];
    mockAdminFrom.mockReturnValue(makeBuilder(reviews, null));

    const res = await GET(makeGet());
    const body = await res.json() as {
      stats: { totalReviews: number; pendingReviews: number };
    };
    expect(body.stats.totalReviews).toBe(1);
    expect(body.stats.pendingReviews).toBe(2);
  });
});

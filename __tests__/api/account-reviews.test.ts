import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockGetUser = vi.fn<
  () => Promise<{ data: { user: { id: string; email: string } | null } }>
>();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const { mockReviews } = vi.hoisted(() => ({
  mockReviews: { data: null as unknown[] | null, error: null as { message: string } | null },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve(mockReviews)),
    })),
  })),
}));

import { GET } from "@/app/api/account/reviews/route";

describe("GET /api/account/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReviews.data = null;
    mockReviews.error = null;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("returns 401 when user has no email", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "" } },
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty array when user has no reviews", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "test@example.com" } },
    });
    mockReviews.data = [];
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reviews).toEqual([]);
  });

  it("returns all reviews for the user regardless of status", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "test@example.com" } },
    });
    const rows = [
      { id: 1, broker_slug: "stake", rating: 5, title: "Great", body: "Loved it", status: "approved", created_at: "2026-01-01T00:00:00Z" },
      { id: 2, broker_slug: "chess-depository", rating: 3, title: "Okay", body: "Average", status: "pending", created_at: "2026-02-01T00:00:00Z" },
      { id: 3, broker_slug: "commsec", rating: 2, title: "Bad", body: "Disappointed", status: "rejected", created_at: "2026-03-01T00:00:00Z" },
    ];
    mockReviews.data = rows;
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reviews).toHaveLength(3);
    expect(json.reviews.map((r: { status: string }) => r.status)).toEqual([
      "approved",
      "pending",
      "rejected",
    ]);
  });

  it("returns 500 when the DB query fails", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "test@example.com" } },
    });
    mockReviews.data = null;
    mockReviews.error = { message: "connection error" };
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("fetch_failed");
  });

  it("returns null data as empty array", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "test@example.com" } },
    });
    mockReviews.data = null;
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reviews).toEqual([]);
  });
});

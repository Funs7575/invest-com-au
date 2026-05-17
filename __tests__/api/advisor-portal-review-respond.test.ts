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

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
}));

const mockGetUser = vi.fn<() => Promise<{ data: { user: { id: string; email: string } | null } }>>();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const { mockPro, mockReview, mockUpsertResult } = vi.hoisted(() => ({
  mockPro: { data: null as { id: number } | null },
  mockReview: { data: null as { id: number; professional_id: number; status: string } | null },
  mockUpsertResult: { data: null as { id: number; body: string; created_at: string; updated_at: string } | null, error: null as { message: string } | null },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "professionals") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => Promise.resolve(mockPro)),
        };
      }
      if (table === "professional_reviews") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => Promise.resolve(mockReview)),
        };
      }
      if (table === "professional_review_responses") {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn(() => Promise.resolve(mockUpsertResult)),
          })),
        };
      }
      return {};
    }),
  })),
}));

import { POST } from "@/app/api/advisor-portal/reviews/respond/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/advisor-portal/reviews/respond", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/advisor-portal/reviews/respond", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPro.data = null;
    mockReview.data = null;
    mockUpsertResult.data = null;
    mockUpsertResult.error = null;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeRequest({ review_id: 1, body: "Great to work with you!" }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no active professional account", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1", email: "test@example.com" } } });
    mockPro.data = null;
    const res = await POST(makeRequest({ review_id: 1, body: "Great to work with you!" }) as never);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body (body too short)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1", email: "advisor@example.com" } } });
    mockPro.data = { id: 42 };
    const res = await POST(makeRequest({ review_id: 1, body: "Hi" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 404 when review does not belong to this advisor", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1", email: "advisor@example.com" } } });
    mockPro.data = { id: 42 };
    mockReview.data = null;
    const res = await POST(makeRequest({ review_id: 99, body: "Thank you for your kind words!" }) as never);
    expect(res.status).toBe(404);
  });

  it("returns 422 when review is not approved", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1", email: "advisor@example.com" } } });
    mockPro.data = { id: 42 };
    mockReview.data = { id: 99, professional_id: 42, status: "pending" };
    const res = await POST(makeRequest({ review_id: 99, body: "Thank you for your kind words!" }) as never);
    expect(res.status).toBe(422);
  });

  it("returns 200 with the response object on success", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1", email: "advisor@example.com" } } });
    mockPro.data = { id: 42 };
    mockReview.data = { id: 5, professional_id: 42, status: "approved" };
    mockUpsertResult.data = { id: 1, body: "Thank you for your kind words!", created_at: "2026-05-14T00:00:00Z", updated_at: "2026-05-14T00:00:00Z" };
    const res = await POST(makeRequest({ review_id: 5, body: "Thank you for your kind words!" }) as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { response: { body: string } };
    expect(json.response.body).toBe("Thank you for your kind words!");
  });

  it("returns 500 when upsert fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1", email: "advisor@example.com" } } });
    mockPro.data = { id: 42 };
    mockReview.data = { id: 5, professional_id: 42, status: "approved" };
    mockUpsertResult.data = null;
    mockUpsertResult.error = { message: "connection error" };
    const res = await POST(makeRequest({ review_id: 5, body: "Thank you for your kind words!" }) as never);
    expect(res.status).toBe(500);
  });
});

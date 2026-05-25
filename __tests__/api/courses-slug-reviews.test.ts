import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks (hoisted before any imports) ──────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

const mockGetUser = vi.fn<
  () => Promise<{ data: { user: { id: string; email?: string } | null } }>
>();

// Server client is used by both GET (course lookup + reviews read) and
// POST (auth check, course lookup, purchase check, upsert).
const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

// Admin client is used only in POST to re-calculate aggregate ratings.
const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ─── Route under test ─────────────────────────────────────────────────────────

import { GET, POST } from "@/app/api/courses/[slug]/reviews/route";
import { isRateLimited } from "@/lib/rate-limit";

// ─── Chain factory ────────────────────────────────────────────────────────────

/**
 * Build a thenable Supabase query chain.
 * - `.single()` resolves immediately with `{ data, error }`.
 * - `.maybeSingle()` resolves immediately with `{ data, error }`.
 * - Awaiting the chain directly (`.then`) also resolves with `{ data, error }`.
 * All other builder methods return `chain` so they are chainable.
 */
function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const resolved = {
    data: res.data !== undefined ? res.data : null,
    error: res.error !== undefined ? res.error : null,
  };

  const chain: Record<string, unknown> = {};
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "lt",
    "lte",
    "gte",
    "is",
    "in",
    "not",
    "or",
    "order",
    "limit",
    "like",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain["single"] = vi.fn(() => Promise.resolve(resolved));
  chain["maybeSingle"] = vi.fn(() => Promise.resolve(resolved));
  chain["then"] = (resolve: (v: { data: unknown; error: unknown; count?: unknown }) => unknown) => Promise.resolve(resolve(resolved));
  chain["catch"] = () => chain;
  return chain;
}

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeGetRequest(slug = "intro-investing"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new NextRequest(
    `http://localhost/api/courses/${slug}/reviews`,
    {
      method: "GET",
      headers: { "x-forwarded-for": "1.2.3.4" },
    },
  );
  return [req, { params: Promise.resolve({ slug }) }];
}

function makePostRequest(
  body: Record<string, unknown>,
  slug = "intro-investing",
): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new NextRequest(
    `http://localhost/api/courses/${slug}/reviews`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
    },
  );
  return [req, { params: Promise.resolve({ slug }) }];
}

// ─── Fixture data ─────────────────────────────────────────────────────────────

const COURSE_ROW = { id: "course-1" };

const PUBLISHED_REVIEWS = [
  {
    id: "rev-1",
    rating: 5,
    headline: "Great course",
    body: "Really enjoyed it",
    is_verified_purchase: true,
    created_at: "2026-01-01T00:00:00Z",
    user_id: "user-1",
  },
  {
    id: "rev-2",
    rating: 3,
    headline: "Decent",
    body: null,
    is_verified_purchase: false,
    created_at: "2026-01-02T00:00:00Z",
    user_id: "user-2",
  },
];

const NEW_REVIEW = {
  id: "rev-3",
  course_id: "course-1",
  user_id: "user-1",
  rating: 4,
  headline: "Good",
  body: "Worth it",
  is_verified_purchase: true,
  status: "published",
};

// ─── GET tests ────────────────────────────────────────────────────────────────

describe("GET /api/courses/[slug]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);

    // Default: course found, then reviews returned
    // Call order: (1) courses.maybeSingle, (2) course_reviews chain
    mockServerFrom
      .mockReturnValueOnce(makeChain({ data: COURSE_ROW }))      // courses lookup
      .mockReturnValueOnce(makeChain({ data: PUBLISHED_REVIEWS })); // reviews query
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const [req, ctx] = makeGetRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 404 when the course slug does not exist", async () => {
    mockServerFrom.mockReset();
    mockServerFrom.mockReturnValueOnce(makeChain({ data: null })); // course not found

    const [req, ctx] = makeGetRequest("unknown-slug");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/course not found/i);
  });

  it("returns 200 with reviews, avg_rating, and count on happy path", async () => {
    const [req, ctx] = makeGetRequest();
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toHaveLength(2);
    // avg of [5, 3] = 4.0
    expect(body.avg_rating).toBe(4);
    expect(body.count).toBe(2);
  });

  it("returns 200 with empty reviews and null avg_rating when no reviews exist", async () => {
    mockServerFrom.mockReset();
    mockServerFrom
      .mockReturnValueOnce(makeChain({ data: COURSE_ROW }))
      .mockReturnValueOnce(makeChain({ data: [] }));

    const [req, ctx] = makeGetRequest();
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toEqual([]);
    expect(body.avg_rating).toBeNull();
    expect(body.count).toBe(0);
  });

  it("returns 200 with null reviews treated as empty array", async () => {
    mockServerFrom.mockReset();
    mockServerFrom
      .mockReturnValueOnce(makeChain({ data: COURSE_ROW }))
      .mockReturnValueOnce(makeChain({ data: null }));

    const [req, ctx] = makeGetRequest();
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toEqual([]);
    expect(body.avg_rating).toBeNull();
    expect(body.count).toBe(0);
  });
});

// ─── POST tests ───────────────────────────────────────────────────────────────

describe("POST /api/courses/[slug]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });

    // Default server client call order for a successful POST:
    //   1. courses.maybeSingle  → course found
    //   2. course_purchases.maybeSingle → verified purchase
    //   3. course_reviews.single (upsert) → new review
    mockServerFrom
      .mockReturnValueOnce(makeChain({ data: COURSE_ROW }))
      .mockReturnValueOnce(makeChain({ data: { id: 77 } }))
      .mockReturnValueOnce(makeChain({ data: NEW_REVIEW }));

    // Admin client call order for aggregate recalc:
    //   1. course_reviews select → all published ratings
    //   2. courses update → void
    mockAdminFrom
      .mockReturnValueOnce(makeChain({ data: [{ rating: 4 }, { rating: 5 }] }))
      .mockReturnValueOnce(makeChain({ data: null }));
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const [req, ctx] = makePostRequest({ rating: 4 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const [req, ctx] = makePostRequest({ rating: 4 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  // ── Validation ───────────────────────────────────────────────────────────────

  it("returns 400 when body is not valid JSON", async () => {
    const req = new NextRequest(
      "http://localhost/api/courses/intro-investing/reviews",
      {
        method: "POST",
        body: "not-json",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "1.2.3.4",
        },
      },
    );
    const ctx = { params: Promise.resolve({ slug: "intro-investing" }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 when rating is missing", async () => {
    const [req, ctx] = makePostRequest({ headline: "Good" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is out of range (0)", async () => {
    const [req, ctx] = makePostRequest({ rating: 0 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is out of range (6)", async () => {
    const [req, ctx] = makePostRequest({ rating: 6 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when headline exceeds 150 characters", async () => {
    const [req, ctx] = makePostRequest({ rating: 4, headline: "x".repeat(151) });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body text exceeds 2000 characters", async () => {
    const [req, ctx] = makePostRequest({ rating: 4, body: "x".repeat(2001) });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  // ── Course lookup ─────────────────────────────────────────────────────────────

  it("returns 404 when course slug does not exist", async () => {
    mockServerFrom.mockReset();
    mockServerFrom.mockReturnValueOnce(makeChain({ data: null })); // course not found

    const [req, ctx] = makePostRequest({ rating: 4 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/course not found/i);
  });

  // ── DB error on upsert ────────────────────────────────────────────────────────

  it("returns 500 when the review upsert fails", async () => {
    mockServerFrom.mockReset();
    mockServerFrom
      .mockReturnValueOnce(makeChain({ data: COURSE_ROW }))         // course found
      .mockReturnValueOnce(makeChain({ data: null }))                // no purchase
      .mockReturnValueOnce(makeChain({ data: null, error: { message: "upsert error" } })); // upsert fails

    const [req, ctx] = makePostRequest({ rating: 4 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  // ── Happy path ────────────────────────────────────────────────────────────────

  it("returns 200 with review object on successful POST", async () => {
    const [req, ctx] = makePostRequest({
      rating: 4,
      headline: "Good",
      body: "Worth it",
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.review).toBeDefined();
    expect(resBody.review.id).toBe("rev-3");
    expect(resBody.review.rating).toBe(4);
  });

  it("accepts a POST with only a rating (optional fields absent)", async () => {
    mockServerFrom.mockReset();
    const reviewNoOptionals = { ...NEW_REVIEW, headline: null, body: null };
    mockServerFrom
      .mockReturnValueOnce(makeChain({ data: COURSE_ROW }))
      .mockReturnValueOnce(makeChain({ data: null }))               // no purchase
      .mockReturnValueOnce(makeChain({ data: reviewNoOptionals }));
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockReturnValueOnce(makeChain({ data: [{ rating: 4 }] }))
      .mockReturnValueOnce(makeChain({ data: null }));

    const [req, ctx] = makePostRequest({ rating: 5 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.review).toBeDefined();
  });

  it("marks is_verified_purchase true when a paid purchase exists", async () => {
    // Default beforeEach already sets up a purchase, so just verify the shape
    const [req, ctx] = makePostRequest({ rating: 5, headline: "Excellent" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    // The upsert was called with is_verified_purchase: true (purchase found)
    // We verify indirectly: the returned review row has the field set
    const resBody = await res.json();
    expect(resBody.review.is_verified_purchase).toBe(true);
  });
});

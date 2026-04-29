import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "127.0.0.1");

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: () => mockGetUser() } }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST } from "@/app/api/review-incentive/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER = { id: "user-abc" };

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/review-incentive", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

const LONG_BODY = "a".repeat(100);
const VALID_POST_BODY = {
  broker_slug: "commsec",
  rating: 4,
  title: "Great platform",
  body: LONG_BODY,
  pros: ["Low fees"],
  cons: [],
};

function setupAdminMock(opts: {
  existingReviews?: { broker_slug: string }[];
  brokers?: { slug: string; name: string }[];
  subscription?: { status: string; id?: string; current_period_end?: string } | null;
  brokerExists?: boolean;
  alreadyReviewed?: boolean;
  insertReviewError?: { message: string } | null;
  insertSubError?: { message: string } | null;
} = {}) {
  const {
    existingReviews = [],
    brokers = [{ slug: "commsec", name: "CommSec" }],
    subscription = null,
    brokerExists = true,
    alreadyReviewed = false,
    insertReviewError = null,
    insertSubError = null,
  } = opts;

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "incentive_reviews") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: insertReviewError }),
        maybeSingle: vi.fn().mockResolvedValue({ data: alreadyReviewed ? { id: "r1" } : null }),
        // first call for GET listing returns existingReviews array
        ...(existingReviews.length >= 0 ? {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: existingReviews }),
            maybeSingle: vi.fn().mockResolvedValue({ data: alreadyReviewed ? { id: "r1" } : null }),
          })),
          insert: vi.fn().mockResolvedValue({ error: insertReviewError }),
        } : {}),
      };
    }
    if (table === "brokers") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: brokers }),
        maybeSingle: vi.fn().mockResolvedValue({ data: brokerExists ? { slug: "commsec", name: "CommSec" } : null }),
      };
    }
    if (table === "subscriptions") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: subscription }),
        insert: vi.fn().mockResolvedValue({ error: insertSubError }),
        update: vi.fn().mockReturnThis(),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/review-incentive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns eligible=true with brokers when user has no reviews", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ existingReviews: [], brokers: [{ slug: "commsec", name: "CommSec" }] });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.eligible).toBe(true);
    expect(body.reward).toBe("1 month Pro");
  });

  it("has_pro is false when no active subscription", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ subscription: null });
    const res = await GET();
    expect((await res.json()).has_pro).toBe(false);
  });

  it("has_pro is true when active subscription exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ subscription: { status: "active" } });
    const res = await GET();
    expect((await res.json()).has_pro).toBe(true);
  });
});

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/review-incentive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const req = new NextRequest("http://localhost/api/review-incentive", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid broker_slug (uppercase)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const res = await POST(makePost({ ...VALID_POST_BODY, broker_slug: "CommSec" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid broker slug/i);
  });

  it("returns 400 for rating < 1", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const res = await POST(makePost({ ...VALID_POST_BODY, rating: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/rating/i);
  });

  it("returns 400 for non-integer rating (e.g. 3.5)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const res = await POST(makePost({ ...VALID_POST_BODY, rating: 3.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short (< 5 chars)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const res = await POST(makePost({ ...VALID_POST_BODY, title: "Hi" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/title/i);
  });

  it("returns 400 when body is under 100 chars", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const res = await POST(makePost({ ...VALID_POST_BODY, body: "short" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/100 characters/i);
  });

  it("returns 400 when body exceeds 5000 chars", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const res = await POST(makePost({ ...VALID_POST_BODY, body: "a".repeat(5001) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/5000/i);
  });

  it("returns 404 when broker not found or inactive", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ brokerExists: false });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 409 when user already reviewed this broker", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ alreadyReviewed: true });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(409);
  });

  it("returns 500 on review insert error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ insertReviewError: { message: "insert failed" } });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(500);
  });

  it("grants new Pro subscription when user has none", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ subscription: null });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.pro_granted).toBe(true);
  });

  it("extends existing subscription by 1 month", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({
      subscription: {
        id: "sub-1",
        status: "active",
        current_period_end: new Date(Date.now() + 86400000 * 15).toISOString(),
      },
    });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(200);
    expect((await res.json()).pro_granted).toBe(true);
  });

  it("does not fail if Pro grant fails — review still returns 200", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupAdminMock({ subscription: null, insertSubError: { message: "sub insert failed" } });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(200);
    expect((await res.json()).pro_granted).toBe(false);
  });
});

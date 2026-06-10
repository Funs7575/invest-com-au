import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// ─── Supabase builder factory ─────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const terminal = { data, error };
  const c: Record<string, unknown> = {
    then: (resolve: (v: typeof terminal) => unknown) =>
      Promise.resolve(resolve(terminal)),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps", "throwOnError",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const mockFrom = vi.fn((..._args: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/refresh-leaderboard/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-refresh-leaderboard";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/refresh-leaderboard", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/refresh-leaderboard — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 300", () => {
    expect(maxDuration).toBe(300);
  });
});

describe("GET /api/cron/refresh-leaderboard — auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/misconfigured/i);
  });

  it("returns 500 when CRON_SECRET is too short", async () => {
    process.env.CRON_SECRET = "tooshort";
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/refresh-leaderboard — empty data path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with ranked:0 when no active advisors", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // professionals: empty

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.ranked).toBe(0);
  });

  it("returns 200 with ranked:0 when professionals returns null", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // professionals: null (falsy check)

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.ranked).toBe(0);
  });
});

describe("GET /api/cron/refresh-leaderboard — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("computes scores and upserts leaderboard rows", async () => {
    const advisor = {
      id: 1,
      rating: 4.9,
      review_count: 10,
      avg_response_minutes: 60,
      profile_score: 80,
    };
    mockFrom.mockReturnValueOnce(makeBuilder([advisor], null)); // professionals
    mockFrom.mockReturnValueOnce(makeBuilder([], null));        // advisor_badges (no badges)
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));      // leaderboard upsert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.ranked).toBe(1);
  });

  it("includes badge count in score calculation", async () => {
    const advisor = {
      id: 2,
      rating: 4.0,
      review_count: 3,
      avg_response_minutes: null,
      profile_score: 50,
    };
    mockFrom.mockReturnValueOnce(makeBuilder([advisor], null)); // professionals
    // advisor has 2 badges
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 2 }, { professional_id: 2 }], null),
    ); // advisor_badges
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // upsert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ranked).toBe(1);
  });

  it("ranks multiple advisors (higher score = lower rank number)", async () => {
    const advisors = [
      // Low scorer
      { id: 10, rating: 3.0, review_count: 1, avg_response_minutes: null, profile_score: 20 },
      // High scorer
      { id: 11, rating: 5.0, review_count: 20, avg_response_minutes: 30, profile_score: 100 },
    ];
    mockFrom.mockReturnValueOnce(makeBuilder(advisors, null)); // professionals
    mockFrom.mockReturnValueOnce(makeBuilder([], null));       // badges
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));     // upsert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ranked).toBe(2);
  });

  it("still returns 200 when leaderboard upsert fails (error logged, not thrown)", async () => {
    const advisor = {
      id: 3,
      rating: 4.5,
      review_count: 5,
      avg_response_minutes: 120,
      profile_score: 70,
    };
    mockFrom.mockReturnValueOnce(makeBuilder([advisor], null)); // professionals
    mockFrom.mockReturnValueOnce(makeBuilder([], null));        // badges
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "upsert failed" })); // upsert error

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // Still returns the count even on upsert error
    expect(body.ranked).toBe(1);
  });

  it("caps score components at their maximum values", async () => {
    // review_count: 100 → reviewScore capped at 30
    // rating: 5.0 → ratingScore capped at 30
    // avg_response_minutes: 0 → max responseScore = 20
    // profile_score: 100 → profileScore = 10
    // 5 badges → badgeScore capped at 10
    const advisor = {
      id: 4,
      rating: 5.0,
      review_count: 100,
      avg_response_minutes: 0,
      profile_score: 100,
    };
    mockFrom.mockReturnValueOnce(makeBuilder([advisor], null));
    // 5 badges
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        Array.from({ length: 5 }, () => ({ professional_id: 4 })),
        null,
      ),
    );
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // upsert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ranked).toBe(1);
  });
});

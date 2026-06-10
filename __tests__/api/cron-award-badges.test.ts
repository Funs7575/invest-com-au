import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/course-certificates", () => ({
  cpdYearFor: vi.fn((_date: unknown) => 2026),
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

import { GET, runtime, maxDuration } from "@/app/api/cron/award-badges/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-award-badges-1234";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/award-badges", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/award-badges — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 300", () => {
    expect(maxDuration).toBe(300);
  });
});

describe("GET /api/cron/award-badges — auth guards", () => {
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
    process.env.CRON_SECRET = "short";
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

describe("GET /api/cron/award-badges — empty data path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // All 6 badge category queries return empty
    mockFrom.mockImplementation(() => makeBuilder([], null));
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with awarded:0 when no professionals match any badge", async () => {
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.awarded).toBe(0);
  });
});

describe("GET /api/cron/award-badges — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("awards profile_complete badge and returns awarded count", async () => {
    // profile_complete query: 1 advisor
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: 1 }], null));
    // advisor_badges upsert for profile_complete → no error
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));
    // top_rated query: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // first_review query: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // cpd_credits query: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // verified query: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // course_creator query: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.awarded).toBe(1);
  });

  it("awards cpd_compliant badge when advisor has >= 40 hours", async () => {
    // profile_complete: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // top_rated: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // first_review: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // cpd_credits: advisor 5 has 45 hours_earned
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 5, hours_earned: 45 }], null),
    );
    // cpd_compliant upsert
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));
    // verified: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // courses: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.awarded).toBe(1);
  });

  it("does NOT award cpd_compliant when advisor hours < 40", async () => {
    // profile_complete: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // top_rated: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // first_review: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // cpd_credits: advisor 6 has only 30 hours
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 6, hours_earned: 30 }], null),
    );
    // verified: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // courses: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.awarded).toBe(0);
  });

  it("awards first_course badge when advisor has 1 published course", async () => {
    // profile_complete: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // top_rated: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // first_review: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // cpd_credits: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // verified: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // courses: advisor 7 has 1 course
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ advisor_professional_id: 7 }], null),
    );
    // first_course upsert
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.awarded).toBe(1);
  });

  it("awards both first_course and course_creator when advisor has >= 3 courses", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // profile_complete
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // top_rated
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // first_review
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // cpd_credits
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // verified
    // courses: advisor 8 has 3 courses
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [
          { advisor_professional_id: 8 },
          { advisor_professional_id: 8 },
          { advisor_professional_id: 8 },
        ],
        null,
      ),
    );
    // first_course upsert
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));
    // course_creator upsert
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.awarded).toBe(2);
  });

  it("awards top_rated and first_review badges independently", async () => {
    // profile_complete: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // top_rated: advisor 9
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: 9 }], null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // upsert
    // first_review: advisor 9 also qualifies
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: 9 }], null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // upsert
    // cpd_credits: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // verified: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // courses: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.awarded).toBe(2);
  });
});

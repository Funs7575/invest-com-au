import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: vi.fn(
    (_name: string, fn: (req: NextRequest) => Promise<unknown>) => fn,
  ),
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
    auth: { admin: { listUsers: vi.fn(async (..._a: unknown[]) => ({ data: { users: [] }, error: null })) } },
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/intent-cohort-rollup/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-cohort-rollup-99";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/intent-cohort-rollup", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/intent-cohort-rollup — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 120", () => {
    expect(maxDuration).toBe(120);
  });
});

describe("GET /api/cron/intent-cohort-rollup — auth guards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

describe("GET /api/cron/intent-cohort-rollup — quiz query error", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when user_quiz_history query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "quiz table missing" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/quiz/i);
  });

  it("returns 500 when quiz_leads query fails", async () => {
    // user_quiz_history succeeds
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // quiz_leads fails
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "leads table error" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/leads/i);
  });
});

describe("GET /api/cron/intent-cohort-rollup — empty data path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with 0 completions and 0 leads, still writes rollup row", async () => {
    // user_quiz_history: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // quiz_leads: empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // investor_cohort_snapshots upsert
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.quiz_completions).toBe(0);
    expect(body.leads_captured).toBe(0);
    // Total rollup row always written
    expect(body.cohort_rows).toBeGreaterThanOrEqual(1);
    expect(body.errors).toBe(0);
    expect(body.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("GET /api/cron/intent-cohort-rollup — success path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockFrom.mockImplementation((..._args: unknown[]) => makeBuilder());
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("groups quiz rows by vertical+experience+range and upserts cohort rows", async () => {
    const quizRows = [
      { inferred_vertical: "etf", answers: { experience: "beginner", amount: "0-10k" } },
      { inferred_vertical: "etf", answers: { experience: "beginner", amount: "0-10k" } },
      { inferred_vertical: "shares", answers: { experience: "intermediate", amount: "10k-50k" } },
    ];
    const leadRows = [
      { inferred_vertical: "etf", experience_level: "beginner", investment_range: "0-10k", utm_source: "google" },
    ];

    mockFrom.mockReturnValueOnce(makeBuilder(quizRows, null));
    mockFrom.mockReturnValueOnce(makeBuilder(leadRows, null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // upsert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.quiz_completions).toBe(3);
    expect(body.leads_captured).toBe(1);
    // Distinct cohort keys: (etf,beginner,0-10k), (shares,intermediate,10k-50k), total row
    expect(body.cohort_rows).toBe(3);
    expect(body.errors).toBe(0);
  });

  it("records upsert error in errors counter but still returns 200", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([
      { inferred_vertical: "shares", answers: { experience: "beginner", amount: "10k-50k" } },
    ], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // upsert fails
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "upsert conflict" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
  });

  it("computes conversion_rate correctly (leads/quizzes * 100)", async () => {
    // 2 quizzes → 1 lead = 50% conversion
    const quizRows = [
      { inferred_vertical: "etf", answers: { experience: "beginner", amount: "0-10k" } },
      { inferred_vertical: "etf", answers: { experience: "beginner", amount: "0-10k" } },
    ];
    const leadRows = [
      { inferred_vertical: "etf", experience_level: "beginner", investment_range: "0-10k", utm_source: "organic" },
    ];

    mockFrom.mockReturnValueOnce(makeBuilder(quizRows, null));
    mockFrom.mockReturnValueOnce(makeBuilder(leadRows, null));

    // Capture the upsert call to inspect rows
    let capturedUpsertData: unknown = null;
    const upsertBuilder = makeBuilder(null, null);
    (upsertBuilder as Record<string, unknown>)["upsert"] = vi.fn((data: unknown) => {
      capturedUpsertData = data;
      return upsertBuilder;
    });
    mockFrom.mockReturnValueOnce(upsertBuilder);

    const res = await GET(authedReq());
    expect(res.status).toBe(200);

    // Verify the cohort row for (etf, beginner, 0-10k) has 50% conversion
    const rows = capturedUpsertData as Array<{
      inferred_vertical: string | null;
      conversion_rate: number | null;
    }>;
    const etfRow = rows.find(
      (r) => r.inferred_vertical === "etf",
    );
    expect(etfRow?.conversion_rate).toBe(50);
  });
});

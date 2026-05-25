import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* ─── Hoisted mocks (vi.mock is hoisted; use vi.hoisted for shared fns) ────── */

const { mockAdminFrom, mockRequireCronAuth, mockWrapCronHandler } =
  vi.hoisted(() => ({
    mockAdminFrom: vi.fn(),
    // Typed to return NextResponse | null so .mockReturnValue accepts both
    // the null (authorised) and NextResponse (rejected) cases.
    mockRequireCronAuth: vi.fn(
      (): NextResponse | null => null,
    ),
    mockWrapCronHandler: vi.fn(
      (
        _name: string,
        handler: (req: NextRequest) => Promise<Response>,
      ) => handler,
    ),
  })) as {
    mockAdminFrom: MockInstance;
    mockRequireCronAuth: MockInstance<() => NextResponse | null>;
    mockWrapCronHandler: MockInstance;
  };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: mockWrapCronHandler,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { GET } from "@/app/api/cron/snapshot-health-scores/route";

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/snapshot-health-scores", {
    headers: { Authorization: "Bearer test-cron-secret" },
  });
}

function makeHealthScores() {
  return [
    {
      broker_slug: "commsec",
      overall_score: 88,
      regulatory_score: 90,
      client_money_score: 85,
      financial_stability_score: 88,
      platform_reliability_score: 82,
      insurance_score: 80,
    },
    {
      broker_slug: "stake",
      overall_score: 72,
      regulatory_score: 75,
      client_money_score: 70,
      financial_stability_score: 68,
      platform_reliability_score: 78,
      insurance_score: 65,
    },
  ];
}

/* Builds a Supabase-like chainable builder for the health_scores SELECT */
function makeSelectBuilder(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
    // For non-single selects the chain resolves directly
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data, error }).then(resolve),
  };
}

/* Builds a builder that records inserts */
function makeInsertCapture(insertError: unknown = null) {
  const inserted: unknown[] = [];
  return {
    inserted,
    builder: {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn((row: unknown) => {
        inserted.push(row);
        return Promise.resolve({ error: insertError });
      }),
    },
  };
}

/* ─── Tests ─────────────────────────────────────────────────────────────────── */

describe("GET /api/cron/snapshot-health-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null); // authorised by default
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    const unauthorisedResponse = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
    mockRequireCronAuth.mockReturnValue(unauthorisedResponse);
    // Since wrapCronHandler is mocked to call through, GET is the handler itself.
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 500 when fetching broker_health_scores fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeSelectBuilder(null, { message: "db error" }),
    );
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/db error/i);
  });

  it("inserts one history row per broker and returns counts", async () => {
    const scores = makeHealthScores();
    const { inserted, builder: insertBuilder } = makeInsertCapture();

    // First call: SELECT from broker_health_scores
    // Subsequent calls: INSERT into broker_health_score_history
    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_health_scores") {
        callCount++;
        return makeSelectBuilder(scores);
      }
      // broker_health_score_history — use insert builder
      return insertBuilder;
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(2);
    expect(body.succeeded).toBe(2);
    expect(body.failed).toBe(0);

    // broker_health_scores is read exactly once per run
    expect(callCount).toBe(1);

    expect(inserted).toHaveLength(2);
    const first = inserted[0] as Record<string, unknown>;
    expect(first.broker_slug).toBe("commsec");
    expect(first.overall_score).toBe(88);
    expect(typeof first.captured_at).toBe("string");
  });

  it("counts insert failures without throwing", async () => {
    const scores = makeHealthScores();
    const { inserted, builder: insertBuilder } = makeInsertCapture({
      message: "constraint violation",
    });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_health_scores") return makeSelectBuilder(scores);
      return insertBuilder;
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.failed).toBe(2);
    expect(body.succeeded).toBe(0);
    expect(inserted).toHaveLength(2); // still attempted both
  });

  it("handles empty broker_health_scores gracefully", async () => {
    mockAdminFrom.mockReturnValue(makeSelectBuilder([]));
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(0);
    expect(body.succeeded).toBe(0);
  });

  it("handles null data from broker_health_scores gracefully (treats as empty)", async () => {
    mockAdminFrom.mockReturnValue(makeSelectBuilder(null));
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(0);
  });

  it("all captured_at timestamps share the same ISO string within a single run", async () => {
    const scores = makeHealthScores();
    const insertedRows: Array<Record<string, unknown>> = [];
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_health_scores") return makeSelectBuilder(scores);
      return {
        insert: (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return Promise.resolve({ error: null });
        },
      };
    });

    await GET(makeRequest());
    expect(insertedRows).toHaveLength(2);
    // All rows in a single cron run should share the same captured_at
    expect(insertedRows[0]?.captured_at).toBe(insertedRows[1]?.captured_at);
  });
});

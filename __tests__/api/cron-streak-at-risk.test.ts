import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsStreakAtRisk = vi.fn((..._a: unknown[]): boolean => false);
vi.mock("@/lib/streak", () => ({
  isStreakAtRisk: (...args: unknown[]) => mockIsStreakAtRisk(...args),
}));

const mockDispatchPushToUser = vi.fn(
  async (..._a: unknown[]): Promise<{ sent: number; failed: number; skipped_no_sub: boolean; stale_removed: number }> => ({
    sent: 1,
    failed: 0,
    skipped_no_sub: false,
    stale_removed: 0,
  }),
);
vi.mock("@/lib/push-dispatch", () => ({
  dispatchPushToUser: (...args: unknown[]) => mockDispatchPushToUser(...args),
}));

// withCronRunLog pass-through
vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(
    async (_name: string, fn: () => Promise<{ response: unknown; stats?: Record<string, unknown> }>) => {
      const result = await fn();
      return result.response;
    },
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
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/streak-at-risk/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-streak-at-risk-123";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/streak-at-risk", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/streak-at-risk — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 120", () => {
    expect(maxDuration).toBe(120);
  });
});

describe("GET /api/cron/streak-at-risk — auth guards", () => {
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

describe("GET /api/cron/streak-at-risk — empty checkins path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with sent:0 when no rows returned from DB", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // user_daily_checkins: empty

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(mockDispatchPushToUser).not.toHaveBeenCalled();
  });

  it("returns 200 with sent:0 when rows is null", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // user_daily_checkins: null

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockDispatchPushToUser).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/streak-at-risk — no at-risk users path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // isStreakAtRisk returns false for all users
    mockIsStreakAtRisk.mockReturnValue(false);
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with sent:0 when no user streaks are at risk", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [
          { user_id: "user-1", check_in_date: "2026-05-28", streak_count: 5 },
          { user_id: "user-2", check_in_date: "2026-05-28", streak_count: 3 },
        ],
        null,
      ),
    );

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockDispatchPushToUser).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/streak-at-risk — success push path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockDispatchPushToUser.mockResolvedValue({
      sent: 1,
      failed: 0,
      skipped_no_sub: false,
      stale_removed: 0,
    });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends push and returns sent:1 for one at-risk user", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [{ user_id: "user-at-risk", check_in_date: "2026-05-28", streak_count: 7 }],
        null,
      ),
    );
    mockIsStreakAtRisk.mockReturnValue(true);

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);

    expect(mockDispatchPushToUser).toHaveBeenCalledOnce();
    const callArgs = mockDispatchPushToUser.mock.calls[0] as [string, { title: string; body: string; url: string; tag: string }];
    expect(callArgs[0]).toBe("user-at-risk");
    expect(callArgs[1].title).toContain("7-day streak");
    expect(callArgs[1].url).toBe("/feed");
    expect(callArgs[1].tag).toBe("streak-at-risk");
  });

  it("does not count user when dispatchPushToUser returns sent:0", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [{ user_id: "user-no-sub", check_in_date: "2026-05-28", streak_count: 3 }],
        null,
      ),
    );
    mockIsStreakAtRisk.mockReturnValue(true);
    mockDispatchPushToUser.mockResolvedValue({
      sent: 0,
      failed: 0,
      skipped_no_sub: true,
      stale_removed: 0,
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it("handles multiple users — sends push to each at-risk user", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [
          { user_id: "user-a", check_in_date: "2026-05-28", streak_count: 5 },
          { user_id: "user-b", check_in_date: "2026-05-28", streak_count: 2 },
          { user_id: "user-c", check_in_date: "2026-05-27", streak_count: 10 },
        ],
        null,
      ),
    );
    // Only first two are at risk
    mockIsStreakAtRisk
      .mockReturnValueOnce(true)   // user-a: at risk
      .mockReturnValueOnce(true)   // user-b: at risk
      .mockReturnValueOnce(false); // user-c: not at risk

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(mockDispatchPushToUser).toHaveBeenCalledTimes(2);
  });

  it("groups multiple checkin rows per user before evaluating streak", async () => {
    // user-multi has 2 rows (sorted descending by date in the DB query)
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [
          { user_id: "user-multi", check_in_date: "2026-05-28", streak_count: 3 },
          { user_id: "user-multi", check_in_date: "2026-05-27", streak_count: 2 },
          { user_id: "user-multi", check_in_date: "2026-05-26", streak_count: 1 },
        ],
        null,
      ),
    );
    mockIsStreakAtRisk.mockReturnValueOnce(true);

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    // isStreakAtRisk was called once (one user, grouped)
    expect(mockIsStreakAtRisk).toHaveBeenCalledOnce();
    expect(mockDispatchPushToUser).toHaveBeenCalledOnce();
  });
});

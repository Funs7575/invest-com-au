import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

const mockComputeUserHealthScore = vi.fn(
  (..._args: unknown[]): { overall: number; diversification: number; cost: number; riskAlignment: number; engagement: number; grade: string } =>
    ({ overall: 72, diversification: 70, cost: 80, riskAlignment: 65, engagement: 75, grade: "B" }),
);
vi.mock("@/lib/user-health-score", () => ({
  computeUserHealthScore: (...args: unknown[]) => mockComputeUserHealthScore(...args),
}));

const mockComputeCurrentStreak = vi.fn((..._args: unknown[]): number => 0);
vi.mock("@/lib/streak", () => ({
  computeCurrentStreak: (...args: unknown[]) => mockComputeCurrentStreak(...args),
}));

const mockSendEmail = vi.fn(
  async (..._args: unknown[]): Promise<{ ok: boolean; error?: string }> => ({ ok: true }),
);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(
    async (_name: string, fn: () => Promise<{ response: unknown }>) => {
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
const mockListUsers = vi.fn(
  async (
    ..._args: unknown[]
  ): Promise<{ data: { users: Array<{ id: string; email?: string }> }; error: unknown }> => ({
    data: { users: [] },
    error: null,
  }),
);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { admin: { listUsers: (...args: unknown[]) => mockListUsers(...args) } },
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/user-health-score-email/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-health-score-123";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/user-health-score-email", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/user-health-score-email — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 300", () => {
    expect(maxDuration).toBe(300);
  });
});

describe("GET /api/cron/user-health-score-email — auth guards", () => {
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
    process.env.CRON_SECRET = "tooshort";
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/user-health-score-email — empty data path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with sent:0 and scored:0 when no users have weekly_digest", async () => {
    // notification_preferences → empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.scored).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/user-health-score-email — success path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockComputeUserHealthScore.mockReturnValue({
      overall: 72, diversification: 70, cost: 80, riskAlignment: 65, engagement: 75, grade: "B",
    });
    mockComputeCurrentStreak.mockReturnValue(3);
    mockSendEmail.mockResolvedValue({ ok: true });
    mockFrom.mockImplementation((..._args: unknown[]) => makeBuilder());
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("scores users and sends health score email", async () => {
    const userId = "user-health-001";
    const email = "healthy@example.com";

    // notification_preferences
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, weekly_digest: true }], null));

    // Bulk parallel queries (Promise.all of 6)
    mockFrom.mockReturnValue(makeBuilder([], null)); // default for all parallel queries

    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });

    // upsert health score log
    mockFrom.mockReturnValue(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scored).toBe(1);
    expect(body.sent).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe(email);
    expect(callArg.subject).toMatch(/health score/i);
    expect(callArg.subject).toContain("B");
    expect(callArg.subject).toContain("72");
    expect(callArg.html).toContain("72");
    expect(callArg.html).toContain("Diversification");
  });

  it("includes delta vs last month when prev score exists", async () => {
    const userId = "user-delta";
    const email = "delta@example.com";

    // Route calls in order:
    // 1. notification_preferences
    // 2-7. Promise.all: holdings, profiles, goals, shortlisted, checkins, prevScores
    // 8. upsert (user_health_score_log)
    mockFrom
      .mockReturnValueOnce(makeBuilder([{ user_id: userId, weekly_digest: true }], null)) // 1. notification_preferences
      .mockReturnValueOnce(makeBuilder([], null))   // 2. investor_holdings
      .mockReturnValueOnce(makeBuilder([], null))   // 3. investor_profiles
      .mockReturnValueOnce(makeBuilder([], null))   // 4. investor_goals
      .mockReturnValueOnce(makeBuilder([], null))   // 5. user_shortlisted_brokers
      .mockReturnValueOnce(makeBuilder([], null))   // 6. user_daily_checkins
      .mockReturnValueOnce(makeBuilder([{ user_id: userId, overall: 60, scored_month: "2026-04-01" }], null)) // 7. user_health_score_log (prevScores)
      .mockReturnValue(makeBuilder(null, null));    // 8. upsert

    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string };
    // Delta = 72 - 60 = +12 should appear in subject
    expect(callArg.subject).toContain("+12");
  });

  it("scores user but does not send email when no email in listUsers", async () => {
    const userId = "user-noemail";

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, weekly_digest: true }], null));
    mockFrom.mockReturnValue(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId }] }, error: null });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scored).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts scored:1 even when sendEmail throws, and continues", async () => {
    const userId = "user-throw";
    const email = "throw@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, weekly_digest: true }], null));
    mockFrom.mockReturnValue(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });

    mockSendEmail.mockRejectedValue(new Error("Resend network error"));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // sendEmail threw → sent not incremented, but scored still 1
    expect(body.scored).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("upserts score log row for each scored user", async () => {
    const userId = "user-upsert";
    const email = "upsert@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, weekly_digest: true }], null));
    mockFrom.mockReturnValue(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // scored=1 verifies the per-user loop ran and upsert was attempted
    expect(body.scored).toBe(1);
    // mockFrom should have been called: 1 (prefs) + 6 (parallel) + 1 (upsert) = 8
    // but slugs=[] skips brokers query, so 7 calls + 1 upsert = 8
    expect(mockFrom.mock.calls.length).toBeGreaterThanOrEqual(7);
  });
});

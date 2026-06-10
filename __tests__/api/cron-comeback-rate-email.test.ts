import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
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

import { GET, runtime, maxDuration } from "@/app/api/cron/comeback-rate-email/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-comeback-rate-12";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/comeback-rate-email", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

function makeSnapshot(brokerId: number, productKind: string, rateBps: number, capturedAt = "2026-05-28T12:00:00Z") {
  return { broker_id: brokerId, product_kind: productKind, rate_bps: rateBps, captured_at: capturedAt };
}

function makeMemoryRow(overrides: Partial<{
  id: string;
  user_id: string;
  broker_id: number;
  product_kind: string;
  last_seen_rate_bps: number;
  notified_rate_bps: number | null;
  notified_at: string | null;
  brokers: { slug: string; name: string };
}> = {}) {
  return {
    id: "mem-1",
    user_id: "user-001",
    broker_id: 1,
    product_kind: "savings_account",
    last_seen_rate_bps: 450,
    notified_rate_bps: null,
    notified_at: null,
    brokers: { slug: "ing", name: "ING" },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/comeback-rate-email — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 120", () => {
    expect(maxDuration).toBe(120);
  });
});

describe("GET /api/cron/comeback-rate-email — auth guards", () => {
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

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/comeback-rate-email — no-data paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with reason=no_snapshots when snapshots table is empty", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // savings_rate_snapshots

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reason).toBe("no_snapshots");
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with sent:0 when memory rows table is empty", async () => {
    // snapshots with one entry
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 500)], null));
    // memory rows empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with sent:0 when no rate changes qualify as candidates", async () => {
    // Snapshot rate equals last_seen_rate_bps → no change
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 450)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeMemoryRow({ last_seen_rate_bps: 450 })], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/comeback-rate-email — success path (rate increase)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockSendEmail.mockResolvedValue({ ok: true });
    mockFrom.mockImplementation((..._args: unknown[]) => makeBuilder());
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends email when rate has increased since last visit", async () => {
    const userId = "user-rateup";
    const email = "rateup@example.com";

    // Current snapshot: 500 bps. User last saw 450 bps → moved up by 50 bps.
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 500)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeMemoryRow({ user_id: userId, last_seen_rate_bps: 450 })], null));

    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });

    // notification_preferences (deal_alerts not opted out)
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, deal_alerts: true }], null));
    // update notified_rate_bps
    mockFrom.mockReturnValue(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.candidates).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe(email);
    expect(callArg.subject).toContain("↑");
    expect(callArg.subject).toContain("5.00%");
    expect(callArg.html).toContain("ING");
    expect(callArg.html).toContain("4.50%"); // old rate
    expect(callArg.html).toContain("5.00%"); // new rate
  });

  it("sends email when rate has decreased, subject uses ↓ arrow", async () => {
    const userId = "user-ratedown";
    const email = "ratedown@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 400)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeMemoryRow({ user_id: userId, last_seen_rate_bps: 450 })], null));

    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, deal_alerts: true }], null));
    mockFrom.mockReturnValue(makeBuilder(null, null));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.sent).toBe(1);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string };
    expect(callArg.subject).toContain("↓");
    expect(callArg.subject).toContain("4.00%");
  });

  it("skips user who opted out of deal_alerts", async () => {
    const userId = "user-optout";
    const email = "optout@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 500)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeMemoryRow({ user_id: userId, last_seen_rate_bps: 450 })], null));

    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    // deal_alerts = false → opted out
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, deal_alerts: false }], null));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips user whose last notification was within cooldown (< 7 days)", async () => {
    const userId = "user-cooldown";
    const email = "cooldown@example.com";
    const recentNotification = new Date(Date.now() - 2 * 86_400_000).toISOString(); // 2 days ago

    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 500)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeMemoryRow({
      user_id: userId,
      last_seen_rate_bps: 450,
      notified_at: recentNotification,
    })], null));

    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, deal_alerts: true }], null));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips candidate when notified_rate_bps already equals current rate", async () => {
    const userId = "user-already-notified";
    const email = "alreadynotified@example.com";

    // Current rate = 500, already notified at 500
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 500)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeMemoryRow({
      user_id: userId,
      last_seen_rate_bps: 450,
      notified_rate_bps: 500,
    })], null));

    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, deal_alerts: true }], null));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it("marks notified_rate_bps on user_rate_memory after successful send", async () => {
    const userId = "user-update";
    const email = "update@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 500)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeMemoryRow({ user_id: userId, last_seen_rate_bps: 450 })], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, deal_alerts: true }], null));
    // update notified_rate_bps
    mockFrom.mockReturnValue(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    // Verify that mockFrom was called at least 4 times (snapshots, memory, prefs, update)
    expect(mockFrom).toHaveBeenCalledTimes(4);
    // The 4th call should be to user_rate_memory (the update)
    const fourthCall = mockFrom.mock.calls[3];
    expect(fourthCall?.[0]).toBe("user_rate_memory");
  });

  it("handles sendEmail throw gracefully and does not update notified_rate_bps", async () => {
    const userId = "user-throw";
    const email = "throw@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshot(1, "savings_account", 500)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeMemoryRow({ user_id: userId, last_seen_rate_bps: 450 })], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, deal_alerts: true }], null));

    mockSendEmail.mockRejectedValue(new Error("network error"));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    // No update to user_rate_memory (4th call should not happen)
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });
});

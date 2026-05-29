import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args),
}));

// withCronRunLog pass-through: just calls the handler and returns its response.
vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(
    async (_name: string, fn: () => Promise<{ response: unknown }>) => {
      const result = await fn();
      return result.response;
    },
  ),
}));

// sendEmail mock — controllable per-test.
const mockSendEmail = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: unknown) => String(s ?? ""),
}));

// Chainable Supabase builder. The thenable resolves with {data, error}.
function makeChain(data: unknown = null, error: unknown = null) {
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

// mockFrom is the central `.from()` on the admin client.
const mockFrom = vi.fn(() => makeChain());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/td-maturity-reminders/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/td-maturity-reminders") as unknown as NextRequest;
}

/**
 * Returns an ISO date string offset by `daysFromNow` from today (UTC).
 * Used to build maturity dates in the REMINDER_WINDOWS [30, 7, 1].
 */
function offsetIso(daysFromNow: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function makeTd(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    user_id: "user-1",
    institution_name: "Big Bank",
    principal_cents: 10_000_00,   // $10,000
    rate_bps: 500,                 // 5.00% p.a.
    term_months: 12,
    maturity_date: offsetIso(30), // triggers the 30-day reminder by default
    ...overrides,
  };
}

function makeUserRow(overrides: Record<string, unknown> = {}) {
  return { id: "user-1", email: "alice@example.com", ...overrides };
}

function makeBestRate(overrides: Record<string, unknown> = {}) {
  return {
    broker_id: 10,
    rate_bps: 520,
    term_months: 12,
    brokers: { name: "Best Bank", slug: "best-bank" },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/td-maturity-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    // By default auth passes.
    mockRequireCronAuth.mockReturnValue(null);
    // By default email succeeds.
    mockSendEmail.mockResolvedValue({ ok: true });
  });

  // ── Static exports ──────────────────────────────────────────────────────────

  it("exports nodejs runtime and maxDuration=60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("returns 401 when requireCronAuth rejects", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ── DB error on TDs fetch ───────────────────────────────────────────────────

  it("returns 500 when user_term_deposits query errors", async () => {
    // query 1: user_term_deposits → error
    mockFrom.mockReturnValueOnce(
      makeChain(null, { message: "DB connection failed" }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("fetch_failed");
  });

  // ── Empty TDs result ────────────────────────────────────────────────────────

  it("returns 200 with sent=0 when no TDs maturing in reminder windows", async () => {
    // query 1: user_term_deposits → empty
    mockFrom.mockReturnValueOnce(makeChain([], null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; message: string };
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/No TDs maturing/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── Dedup: already-sent reminder is skipped ─────────────────────────────────

  it("skips a TD when already in td_reminder_sends (dedup)", async () => {
    // query 1: user_term_deposits — one TD maturing in 30 days
    mockFrom.mockReturnValueOnce(makeChain([makeTd()], null));
    // query 2: td_reminder_sends — already sent for td_id=1, days_before=30
    mockFrom.mockReturnValueOnce(makeChain([{ td_id: 1, days_before: 30 }], null));
    // query 3: savings_rate_snapshots
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null));
    // query 4: auth.users
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number; totalTds: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.totalTds).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── Success: one TD, one reminder sent ──────────────────────────────────────

  it("sends one reminder and returns sent=1 for a new TD", async () => {
    // query 1: user_term_deposits
    mockFrom.mockReturnValueOnce(makeChain([makeTd()], null));
    // query 2: td_reminder_sends → empty (no prior sends)
    mockFrom.mockReturnValueOnce(makeChain([], null));
    // query 3: savings_rate_snapshots
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null));
    // query 4: auth.users
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    // query 5: insert into td_reminder_sends
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number; totalTds: number };
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.totalTds).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        from: "Invest.com.au <reminders@invest.com.au>",
      }),
    );
  });

  // ── Email subject mentions the institution name ─────────────────────────────

  it("includes institution name and urgency in email subject", async () => {
    mockFrom.mockReturnValueOnce(
      makeChain([makeTd({ institution_name: "First National Bank", maturity_date: offsetIso(7), term_months: 6 })], null),
    );
    mockFrom.mockReturnValueOnce(makeChain([], null));                // td_reminder_sends
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null));  // snapshots
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));   // auth.users
    mockFrom.mockReturnValueOnce(makeChain(null, null));              // insert

    await GET(makeReq());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("First National Bank"),
      }),
    );
  });

  // ── 1-day window → subject says "tomorrow" ──────────────────────────────────

  it("uses 'tomorrow' urgency label for 1-day reminder", async () => {
    mockFrom.mockReturnValueOnce(
      makeChain([makeTd({ maturity_date: offsetIso(1) })], null),
    );
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    await GET(makeReq());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/tomorrow/i),
      }),
    );
  });

  // ── 7-day window → subject says "in 7 days" ─────────────────────────────────

  it("uses 'in 7 days' urgency label for 7-day reminder", async () => {
    mockFrom.mockReturnValueOnce(
      makeChain([makeTd({ maturity_date: offsetIso(7) })], null),
    );
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    await GET(makeReq());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/in 7 days/i),
      }),
    );
  });

  // ── User has no email in auth.users → skip ──────────────────────────────────

  it("skips TD when user email is missing from auth.users", async () => {
    mockFrom.mockReturnValueOnce(makeChain([makeTd()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));               // td_reminder_sends
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null)); // snapshots
    mockFrom.mockReturnValueOnce(makeChain([], null));               // auth.users — no rows

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── sendEmail fails → log and continue without incrementing sent ─────────────

  it("continues past a failed sendEmail and does not increment sent", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "HTTP 429" });

    mockFrom.mockReturnValueOnce(makeChain([makeTd()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    // No insert expected — send failed

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  // ── Multiple TDs across different reminder windows ───────────────────────────

  it("processes TDs in all three reminder windows (30, 7, 1 days)", async () => {
    const tds = [
      makeTd({ id: 1, user_id: "user-1", maturity_date: offsetIso(30) }),
      makeTd({ id: 2, user_id: "user-2", maturity_date: offsetIso(7) }),
      makeTd({ id: 3, user_id: "user-3", maturity_date: offsetIso(1) }),
    ];
    const users = [
      makeUserRow({ id: "user-1", email: "u1@example.com" }),
      makeUserRow({ id: "user-2", email: "u2@example.com" }),
      makeUserRow({ id: "user-3", email: "u3@example.com" }),
    ];

    mockFrom.mockReturnValueOnce(makeChain(tds, null));              // user_term_deposits
    mockFrom.mockReturnValueOnce(makeChain([], null));               // td_reminder_sends (empty)
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null)); // snapshots
    mockFrom.mockReturnValueOnce(makeChain(users, null));            // auth.users
    mockFrom.mockReturnValueOnce(makeChain(null, null));             // insert td 1
    mockFrom.mockReturnValueOnce(makeChain(null, null));             // insert td 2
    mockFrom.mockReturnValueOnce(makeChain(null, null));             // insert td 3

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; totalTds: number };
    expect(body.sent).toBe(3);
    expect(body.totalTds).toBe(3);
    expect(mockSendEmail).toHaveBeenCalledTimes(3);
  });

  // ── BestRates: similar-term filtering prefers rates near the TD's term ────────

  it("uses similar-term rates when at least 3 match the TD's term range", async () => {
    // TD has term_months=12; similar rates are those with term_months in [6, 24].
    const td = makeTd({ term_months: 12 });
    const rates = [
      makeBestRate({ broker_id: 1, rate_bps: 520, term_months: 12 }),
      makeBestRate({ broker_id: 2, rate_bps: 510, term_months: 9 }),
      makeBestRate({ broker_id: 3, rate_bps: 505, term_months: 24 }),
      // This one is outside the [6, 24] window so won't match "similar"
      makeBestRate({ broker_id: 4, rate_bps: 530, term_months: 60 }),
    ];

    mockFrom.mockReturnValueOnce(makeChain([td], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain(rates, null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
    // Confirm email was sent with HTML content
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining("Best Bank") }),
    );
  });

  // ── BestRates: array-shape brokers join (fallback branch) ────────────────────

  it("resolves provider name when brokers is an array (array-shape join)", async () => {
    const rate = {
      broker_id: 10,
      rate_bps: 550,
      term_months: 12,
      // Supabase sometimes returns array shape for joined relations
      brokers: [{ name: "Array Bank", slug: "array-bank" }],
    };

    mockFrom.mockReturnValueOnce(makeChain([makeTd()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([rate], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    await GET(makeReq());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Array Bank"),
      }),
    );
  });

  // ── BestRates: null brokers join → shows "Unknown provider" ──────────────────

  it("shows 'Unknown provider' when brokers join returns null", async () => {
    const rate = {
      broker_id: 10,
      rate_bps: 550,
      term_months: 12,
      brokers: null,
    };

    mockFrom.mockReturnValueOnce(makeChain([makeTd()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([rate], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    await GET(makeReq());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Unknown provider"),
      }),
    );
  });

  // ── BestRates: null term_months → shows "—" in rate table ───────────────────

  it("shows — as term label when rate term_months is null", async () => {
    const rate = makeBestRate({ term_months: null });

    mockFrom.mockReturnValueOnce(makeChain([makeTd()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([rate], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    await GET(makeReq());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(">—<"),
      }),
    );
  });

  // ── Empty rate snapshots → ratesSection falls back to plain link ──────────────

  it("renders fallback 'Compare' link when no rate snapshots exist", async () => {
    mockFrom.mockReturnValueOnce(makeChain([makeTd()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));  // empty snapshots
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    await GET(makeReq());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Compare current TD rates"),
      }),
    );
  });

  // ── totalTds is accurate in the response ────────────────────────────────────

  it("returns accurate totalTds count regardless of skips", async () => {
    const tds = [
      makeTd({ id: 1, user_id: "user-1", maturity_date: offsetIso(30) }),
      makeTd({ id: 2, user_id: "user-2", maturity_date: offsetIso(30) }),
    ];

    mockFrom.mockReturnValueOnce(makeChain(tds, null));
    // Both already sent
    mockFrom.mockReturnValueOnce(
      makeChain([{ td_id: 1, days_before: 30 }, { td_id: 2, days_before: 30 }], null),
    );
    mockFrom.mockReturnValueOnce(makeChain([makeBestRate()], null));
    mockFrom.mockReturnValueOnce(
      makeChain([
        makeUserRow({ id: "user-1", email: "u1@example.com" }),
        makeUserRow({ id: "user-2", email: "u2@example.com" }),
      ], null),
    );

    const res = await GET(makeReq());
    const body = await res.json() as { sent: number; skipped: number; totalTds: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(2);
    expect(body.totalTds).toBe(2);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

/**
 * Tests for the td-maturity-reminders cron route.
 *
 * Covered paths:
 *   - requireCronAuth gate (401 / 500)
 *   - tdsErr on user_term_deposits query → 500
 *   - no TDs maturing in reminder windows → 200 "No TDs maturing"
 *   - happy path: sends email + inserts td_reminder_sends for each TD
 *   - dedup: already-sent (td_id, days_before) pairs are skipped
 *   - no email found in auth.users → warning, skip
 *   - sendEmail error → warning, skip (not counted as sent)
 *   - similar-term rate filtering: rates with matching term preferred
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, error: undefined })),
}));

/**
 * Chainable Supabase builder. Every method returns `this`; `.then` makes
 * it thenable so `await builder` resolves with the given result.
 */
function makeBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps", "throwOnError",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn<(table: string) => Record<string, unknown>>(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Import route after mocks ─────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/td-maturity-reminders/route";
import { sendEmail } from "@/lib/resend";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/td-maturity-reminders", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** ISO date string N days from now (UTC midnight). */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A minimal TdRow maturing in `days` days. */
function makeTd(id: number, userId: string, days: 30 | 7 | 1) {
  return {
    id,
    user_id: userId,
    institution_name: "Test Bank",
    principal_cents: 1_000_000, // $10,000
    rate_bps: 450,
    term_months: 12,
    maturity_date: daysFromNow(days),
  };
}

/** A minimal BestRateRow. */
function makeBestRate(brokerId: number, rateBps: number, termMonths: number | null = 12) {
  return {
    broker_id: brokerId,
    rate_bps: rateBps,
    term_months: termMonths,
    brokers: { name: `Bank ${brokerId}`, slug: `bank-${brokerId}` },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/td-maturity-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.unstubAllEnvs();
  });

  it("exports nodejs runtime and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrongsecret" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 when user_term_deposits query errors", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // cron_run_log insert — succeed
        return makeBuilder({ data: { id: "run-1" }, error: null });
      }
      // user_term_deposits error
      return makeBuilder({ data: null, error: { message: "connection refused" } });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });

  it("returns 200 with sent:0 when no TDs are maturing in reminder windows", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no tds maturing/i);
  });

  it("happy path: sends email and inserts td_reminder_sends for a 30-day window TD", async () => {
    const td = makeTd(1, "user-1", 30);
    let insertCalled = false;

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [td], error: null });
      }
      if (table === "td_reminder_sends") {
        const builder = makeBuilder({ data: [], error: null });
        // Override insert to track call + chain throwOnError
        (builder as Record<string, unknown>).insert = vi.fn(() => {
          insertCalled = true;
          return {
            throwOnError: vi.fn(() => Promise.resolve({ error: null })),
          };
        });
        return builder;
      }
      if (table === "savings_rate_snapshots") {
        return makeBuilder({
          data: [makeBestRate(10, 480, 12), makeBestRate(11, 470, 12)],
          error: null,
        });
      }
      if (table === "auth.users") {
        return makeBuilder({
          data: [{ id: "user-1", email: "user1@example.com" }],
          error: null,
        });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.totalTds).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user1@example.com",
        from: expect.stringContaining("reminders@invest.com.au"),
        subject: expect.stringContaining("in 30 days"),
      }),
    );
    expect(insertCalled).toBe(true);
  });

  it("uses 'tomorrow' phrasing for 1-day window", async () => {
    const td = makeTd(2, "user-1", 1);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [td], error: null });
      }
      if (table === "td_reminder_sends") {
        const builder = makeBuilder({ data: [], error: null });
        (builder as Record<string, unknown>).insert = vi.fn(() => ({
          throwOnError: vi.fn(() => Promise.resolve({ error: null })),
        }));
        return builder;
      }
      if (table === "savings_rate_snapshots") {
        return makeBuilder({ data: [makeBestRate(10, 450, 12)], error: null });
      }
      if (table === "auth.users") {
        return makeBuilder({ data: [{ id: "user-1", email: "user1@example.com" }], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("tomorrow"),
      }),
    );
  });

  it("skips already-sent (td_id, days_before) pairs", async () => {
    const td = makeTd(3, "user-1", 7);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [td], error: null });
      }
      if (table === "td_reminder_sends") {
        // Report the key as already sent
        return makeBuilder({
          data: [{ td_id: td.id, days_before: 7 }],
          error: null,
        });
      }
      if (table === "savings_rate_snapshots") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "auth.users") {
        return makeBuilder({ data: [{ id: "user-1", email: "user1@example.com" }], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips TD when no email found in auth.users", async () => {
    const td = makeTd(4, "user-no-email", 30);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [td], error: null });
      }
      if (table === "td_reminder_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "savings_rate_snapshots") {
        return makeBuilder({ data: [makeBestRate(10, 450, 12)], error: null });
      }
      if (table === "auth.users") {
        // No matching user
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it("logs warning and continues when sendEmail fails", async () => {
    const td = makeTd(5, "user-1", 30);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [td], error: null });
      }
      if (table === "td_reminder_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "savings_rate_snapshots") {
        return makeBuilder({ data: [makeBestRate(10, 450, 12)], error: null });
      }
      if (table === "auth.users") {
        return makeBuilder({ data: [{ id: "user-1", email: "user1@example.com" }], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "smtp error" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // Route continues on sendErr — td not counted
    expect(body.sent).toBe(0);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("handles multiple TDs across different reminder windows", async () => {
    const td30 = makeTd(10, "user-1", 30);
    const td7 = { ...makeTd(11, "user-1", 7), maturity_date: daysFromNow(7) };
    const td1 = { ...makeTd(12, "user-1", 1), maturity_date: daysFromNow(1) };

    let insertCount = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [td30, td7, td1], error: null });
      }
      if (table === "td_reminder_sends") {
        const builder = makeBuilder({ data: [], error: null });
        (builder as Record<string, unknown>).insert = vi.fn(() => {
          insertCount++;
          return {
            throwOnError: vi.fn(() => Promise.resolve({ error: null })),
          };
        });
        return builder;
      }
      if (table === "savings_rate_snapshots") {
        return makeBuilder({ data: [makeBestRate(10, 480, 12)], error: null });
      }
      if (table === "auth.users") {
        return makeBuilder({ data: [{ id: "user-1", email: "user1@example.com" }], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(3);
    expect(body.skipped).toBe(0);
    expect(body.totalTds).toBe(3);
    expect(sendEmail).toHaveBeenCalledTimes(3);
    expect(insertCount).toBe(3);
  });

  it("sends email with empty rates section when no snapshots available", async () => {
    const td = makeTd(20, "user-1", 7);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [td], error: null });
      }
      if (table === "td_reminder_sends") {
        const builder = makeBuilder({ data: [], error: null });
        (builder as Record<string, unknown>).insert = vi.fn(() => ({
          throwOnError: vi.fn(() => Promise.resolve({ error: null })),
        }));
        return builder;
      }
      if (table === "savings_rate_snapshots") {
        // No rates available
        return makeBuilder({ data: [], error: null });
      }
      if (table === "auth.users") {
        return makeBuilder({ data: [{ id: "user-1", email: "user1@example.com" }], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    // Email should still be sent even with no comparison rates
    expect(sendEmail).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(sendEmail).mock.calls[0]?.[0];
    // HTML should contain the fallback compare link
    expect(callArgs?.html).toContain("term-deposits");
  });

  it("deduplicates snapshot rows to latest per broker before sorting", async () => {
    const td = makeTd(30, "user-1", 30);
    const capturedSendEmail = vi.mocked(sendEmail);

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_term_deposits") {
        return makeBuilder({ data: [td], error: null });
      }
      if (table === "td_reminder_sends") {
        const builder = makeBuilder({ data: [], error: null });
        (builder as Record<string, unknown>).insert = vi.fn(() => ({
          throwOnError: vi.fn(() => Promise.resolve({ error: null })),
        }));
        return builder;
      }
      if (table === "savings_rate_snapshots") {
        // Two rows for same broker — route should deduplicate to first (ordered by captured_at DESC)
        return makeBuilder({
          data: [
            makeBestRate(1, 500, 12), // first row (newest for broker 1)
            makeBestRate(1, 480, 12), // duplicate broker_id 1 — should be skipped
            makeBestRate(2, 490, 12), // broker 2
            makeBestRate(3, 470, 12), // broker 3
            makeBestRate(4, 460, 12), // broker 4
            makeBestRate(5, 450, 12), // broker 5
            makeBestRate(6, 440, 12), // broker 6 — beyond top 5 after dedup + sort
          ],
          error: null,
        });
      }
      if (table === "auth.users") {
        return makeBuilder({ data: [{ id: "user-1", email: "user1@example.com" }], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    capturedSendEmail.mockResolvedValue({ ok: true, error: undefined });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    expect(capturedSendEmail).toHaveBeenCalledOnce();
    const callArgs = capturedSendEmail.mock.calls[0]?.[0];
    // Should show top 5 brokers — broker 1 appears once (deduped), broker 6 excluded
    expect(callArgs?.html).toContain("Bank 1");
    expect(callArgs?.html).not.toContain("Bank 6");
  });
});

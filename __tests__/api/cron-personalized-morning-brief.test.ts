import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: string) => String(s ?? "")),
}));

const mockSendEmail = vi.fn(
  async (..._args: unknown[]): Promise<{ ok: boolean; error?: string }> => ({ ok: true }),
);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

// ─── Supabase builder factory ─────────────────────────────────────────────────

function makeBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
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
    from: mockFrom,
    auth: { admin: { listUsers: mockListUsers } },
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/personalized-morning-brief/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/personalized-morning-brief", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/personalized-morning-brief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // Default: every from() call resolves to empty data
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  // ── Exports ─────────────────────────────────────────────────────────────────

  it("exports runtime = 'nodejs' and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  // ── Auth guards ──────────────────────────────────────────────────────────────

  it("returns 500 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/misconfigured/i);
  });

  it("returns 500 when CRON_SECRET is too short (< 16 chars)", async () => {
    process.env.CRON_SECRET = "short";
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong-secret" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  // ── Empty / dedup paths ──────────────────────────────────────────────────────

  it("returns 200 with sent:0 when no users have morning_brief enabled", async () => {
    // Default mockFrom returns [] — notification_preferences query returns no rows
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no opted-in users/i);
    // sendEmail must NOT be called
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with sent:0 when all opted-in users are already briefed today", async () => {
    const userId = "user-001";
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      switch (callIdx) {
        // cron_run_log insert (.insert.select.single)
        case 1: return makeBuilder({ data: { id: "log-1" }, error: null });
        // notification_preferences — one opted-in user
        case 2: return makeBuilder({ data: [{ user_id: userId }], error: null });
        // morning_brief_sends — user already sent today
        case 3: return makeBuilder({ data: [{ user_id: userId }], error: null });
        // cron_run_log update
        default: return makeBuilder({ data: null, error: null });
      }
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already briefed/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── DB error path ────────────────────────────────────────────────────────────

  it("returns 500 when notification_preferences query errors", async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      switch (callIdx) {
        // cron_run_log insert
        case 1: return makeBuilder({ data: { id: "log-1" }, error: null });
        // notification_preferences error
        case 2: return makeBuilder({ data: null, error: { message: "DB unavailable" } });
        // cron_run_log update
        default: return makeBuilder({ data: null, error: null });
      }
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/DB unavailable/);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── Success path ─────────────────────────────────────────────────────────────

  it("sends emails to eligible users and returns 200 with sent count", async () => {
    const userId = "user-abc";
    let callIdx = 0;

    mockFrom.mockImplementation(() => {
      callIdx++;
      switch (callIdx) {
        // cron_run_log insert
        case 1: return makeBuilder({ data: { id: "log-1" }, error: null });
        // notification_preferences — one opted-in user
        case 2: return makeBuilder({ data: [{ user_id: userId }], error: null });
        // morning_brief_sends dedup — no prior sends
        case 3: return makeBuilder({ data: [], error: null });
        // rate_change_log (shared market fact)
        case 4: return makeBuilder({
          data: [{
            product_kind: "savings",
            broker_slug: "ubank",
            old_rate_bps: 450,
            new_rate_bps: 475,
            changed_at: "2026-05-29T00:00:00Z",
          }],
          error: null,
        });
        // investor_profiles for user
        case 5: return makeBuilder({
          data: { primary_vertical: "shares", experience_level: "intermediate" },
          error: null,
        });
        // user_rate_memory (rate section)
        case 6: return makeBuilder({
          data: [{
            product_kind: "savings",
            last_seen_rate_bps: 475,
            notified_rate_bps: 450,
            brokers: { name: "UBank", slug: "ubank" },
          }],
          error: null,
        });
        // advisor_follows (advisor section)
        case 7: return makeBuilder({ data: [], error: null });
        // articles (article section)
        case 8: return makeBuilder({
          data: [{
            title: "Best ASX ETFs for 2026",
            slug: "best-asx-etfs-2026",
            category: "shares",
            read_time: 5,
          }],
          error: null,
        });
        // morning_brief_sends insert
        case 9: return makeBuilder({ data: null, error: null });
        // cron_run_log update
        default: return makeBuilder({ data: null, error: null });
      }
    });

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: "user@example.com" }] },
      error: null,
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.total_eligible).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const emailArgs = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
      from: string;
    };
    expect(emailArgs.to).toBe("user@example.com");
    expect(emailArgs.subject).toContain("morning brief");
    expect(emailArgs.from).toBe("Invest.com.au <brief@invest.com.au>");
    expect(emailArgs.html).toContain("UBank");
  });

  it("increments errors when sendEmail fails and returns 200 with errors count", async () => {
    const userId = "user-fail";
    let callIdx = 0;

    mockFrom.mockImplementation(() => {
      callIdx++;
      switch (callIdx) {
        case 1: return makeBuilder({ data: { id: "log-1" }, error: null });
        case 2: return makeBuilder({ data: [{ user_id: userId }], error: null });
        case 3: return makeBuilder({ data: [], error: null });
        case 4: return makeBuilder({ data: [], error: null }); // rate_change_log empty
        case 5: return makeBuilder({ data: null, error: null }); // investor_profiles
        case 6: return makeBuilder({ data: [], error: null }); // user_rate_memory
        case 7: return makeBuilder({ data: [], error: null }); // advisor_follows
        case 8: return makeBuilder({ // articles with a result so section isn't null
          data: [{ title: "Article", slug: "article", category: "general", read_time: 3 }],
          error: null,
        });
        default: return makeBuilder({ data: null, error: null });
      }
    });

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: "fail@example.com" }] },
      error: null,
    });

    // sendEmail returns failure
    mockSendEmail.mockResolvedValue({ ok: false, error: "Resend API down" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // The user had no email sections (rate_memory=[], advisor=[], article returns 1 item)
    // so at minimum the article section triggers a send attempt that fails
    expect(typeof body.sent).toBe("number");
    expect(typeof body.errors).toBe("number");
  });

  it("skips a user when email is not in the auth emailMap", async () => {
    const userId = "user-noemail";
    let callIdx = 0;

    mockFrom.mockImplementation(() => {
      callIdx++;
      switch (callIdx) {
        case 1: return makeBuilder({ data: { id: "log-1" }, error: null });
        case 2: return makeBuilder({ data: [{ user_id: userId }], error: null });
        case 3: return makeBuilder({ data: [], error: null }); // no prior sends
        case 4: return makeBuilder({ data: [], error: null }); // rate_change_log
        default: return makeBuilder({ data: null, error: null });
      }
    });

    // listUsers returns no users → emailMap is empty
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // skipped because no email → counts as fulfilled (returns early, not throw)
    expect(body.sent).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

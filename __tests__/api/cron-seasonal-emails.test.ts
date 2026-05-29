import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockSendEmail = vi.fn(
  async (..._args: unknown[]): Promise<{ ok: boolean; error?: string }> => ({ ok: true }),
);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

// withCronRunLog pass-through
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

import { GET, runtime, maxDuration } from "@/app/api/cron/seasonal-emails/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-seasonal-12345678";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/seasonal-emails", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

/**
 * Stub Date globally to a fixed UTC date so detectCampaign behaves predictably.
 */
function stubDate(isoDate: string) {
  const fixed = new Date(isoDate);
  vi.setSystemTime(fixed);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/seasonal-emails — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("GET /api/cron/seasonal-emails — auth guards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubDate("2026-06-25T08:00:00Z");
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("returns 500 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/misconfigured/i);
  });

  it("returns 500 when CRON_SECRET is too short (< 16 chars)", async () => {
    process.env.CRON_SECRET = "toobrief";
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong-token" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/seasonal-emails — no active campaign", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("returns 200 with no-campaign message on a regular day (e.g. 15 May)", async () => {
    stubDate("2026-05-15T08:00:00Z"); // Mid-May, no campaign
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no seasonal campaign/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with no-campaign message on 22 Jun (day before EOFY window)", async () => {
    stubDate("2026-06-22T08:00:00Z");
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/no seasonal campaign/i);
  });

  it("returns 200 with no-campaign message on 30 Jun (day after EOFY window ends)", async () => {
    stubDate("2026-06-30T08:00:00Z");
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/no seasonal campaign/i);
  });

  it("returns 200 with no-campaign message on 2 July (day after new FY kickstart)", async () => {
    stubDate("2026-07-02T08:00:00Z");
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/no seasonal campaign/i);
  });
});

describe("GET /api/cron/seasonal-emails — EOFY countdown campaign", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("returns 200 sent:0 'No opted-in users' on Jun 25 when prefs table is empty", async () => {
    stubDate("2026-06-25T08:00:00Z"); // 5 days to EOFY
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // notification_preferences

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no opted-in users/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when notification_preferences query errors on an active campaign day", async () => {
    stubDate("2026-06-25T08:00:00Z");
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "DB down" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB down");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 sent:0 when all users already received EOFY campaign this year", async () => {
    const userId = "user-eofy";
    stubDate("2026-06-25T08:00:00Z");

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null)); // prefs
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null)); // seasonal_email_sends

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already received this campaign/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends EOFY email and returns 200 with kind=eofy_countdown, sent=1 on Jun 25", async () => {
    const userId = "user-eofy2";
    const email = "eofy2@example.com";
    stubDate("2026-06-25T08:00:00Z"); // 5 days to EOFY

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null)); // prefs
    mockFrom.mockReturnValueOnce(makeBuilder([], null));                     // dedup → none sent
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));                   // insert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("eofy_countdown");
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.year).toBe(2026);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      from: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe(email);
    expect(callArg.from).toBe("Invest.com.au <seasonal@invest.com.au>");
    expect(callArg.subject).toMatch(/EOFY/);
    expect(callArg.subject).toMatch(/5 days to go/);
    expect(callArg.html).toContain("5 days to 30 June");
  });

  it("uses 'Last day!' urgency wording in subject on Jun 29 (1 day to EOFY)", async () => {
    const userId = "user-lastday";
    const email = "lastday@example.com";
    stubDate("2026-06-29T08:00:00Z"); // daysToEofy = 1

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string; html: string };
    expect(callArg.subject).toMatch(/Last day!/);
    expect(callArg.html).toContain("Last day of the financial year!");
  });

  it("uses 'X days left' in subject for 2-3 days remaining (Jun 27)", async () => {
    const userId = "user-3days";
    const email = "threedays@example.com";
    stubDate("2026-06-27T08:00:00Z"); // daysToEofy = 3

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string };
    expect(callArg.subject).toMatch(/3 days left/);
  });

  it("counts errors when sendEmail fails during EOFY send", async () => {
    const userId = "user-fail";
    const email = "fail@example.com";
    stubDate("2026-06-25T08:00:00Z");

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });

    mockSendEmail.mockResolvedValue({ ok: false, error: "timeout" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.sent).toBe(0);
  });
});

describe("GET /api/cron/seasonal-emails — new FY kickstart campaign", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("sends new FY email and returns 200 with kind=new_fy_kickstart on Jul 1", async () => {
    const userId = "user-newfy";
    const email = "newfy@example.com";
    stubDate("2026-07-01T08:00:00Z"); // 1 July

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null)); // prefs
    mockFrom.mockReturnValueOnce(makeBuilder([], null));                     // dedup → not sent
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));                   // insert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("new_fy_kickstart");
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.year).toBe(2026);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe(email);
    expect(callArg.subject).toMatch(/New Financial Year/);
    expect(callArg.subject).toContain("2026–2027");
    expect(callArg.html).toContain("Happy New Financial Year!");
  });

  it("returns 200 sent:0 when all users already received new_fy_kickstart this year", async () => {
    const userId = "user-alreadyfy";
    stubDate("2026-07-01T08:00:00Z");

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already received this campaign/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips user with no email in emailMap without calling sendEmail", async () => {
    const userId = "user-noemail-seasonal";
    stubDate("2026-07-01T08:00:00Z");

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // listUsers → user has no email field
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId }] }, error: null });
    // Remaining from() calls (insert won't happen)
    mockFrom.mockImplementation(() => makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns skipped_already_sent count with multiple users", async () => {
    const userId1 = "user-already-sent";
    const userId2 = "user-pending-fy";
    const email2 = "pending-fy@example.com";
    stubDate("2026-07-01T08:00:00Z");

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId1 }, { user_id: userId2 }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId1 }], null)); // userId1 already sent
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId2, email: email2 }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // insert for userId2

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped_already_sent).toBe(1);
    expect(body.total_eligible).toBe(1);
    expect(body.sent).toBe(1);
  });
});

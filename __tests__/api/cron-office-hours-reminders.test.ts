import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: unknown) => String(s ?? "")),
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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { admin: { listUsers: vi.fn(async (..._a: unknown[]) => ({ data: { users: [] }, error: null })) } },
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/office-hours-reminders/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-officehrs-12345";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/office-hours-reminders", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

const tomorrowIso = new Date(Date.now() + 86_400_000).toISOString();

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Investing Basics Q&A",
    description: "Ask anything about investing.",
    scheduled_at: tomorrowIso,
    professionals: { name: "Alice Advisor", slug: "alice-advisor" },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/office-hours-reminders — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("GET /api/cron/office-hours-reminders — auth guards", () => {
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

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/office-hours-reminders — DB error path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when advisor_office_hours fetch fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "DB error" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/office-hours-reminders — empty data paths", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with no sessions message when no sessions starting tomorrow", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no sessions/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 when sessions exist but all RSVPs already reminded", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([makeSession()], null));
    // rsvps with reminded_at IS NULL → empty (all already reminded)
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already reminded/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/office-hours-reminders — success path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockSendEmail.mockResolvedValue({ ok: true });
    mockFrom.mockImplementation((..._args: unknown[]) => makeBuilder());
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends reminder email and marks reminded_at for the RSVP", async () => {
    const userId = "user-rsvp-001";
    const email = "rsvpuser@example.com";
    const session = makeSession({ id: 42 });

    // advisor_office_hours
    mockFrom.mockReturnValueOnce(makeBuilder([session], null));
    // office_hour_rsvps (not yet reminded)
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, session_id: 42, reminded_at: null }], null));
    // auth.users
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));
    // update reminded_at
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
      from: string;
    };
    expect(callArg.to).toBe(email);
    expect(callArg.from).toContain("reminders@invest.com.au");
    expect(callArg.subject).toMatch(/tomorrow/i);
    expect(callArg.html).toContain("Investing Basics Q&A");
    expect(callArg.html).toContain("Alice Advisor");
  });

  it("skips RSVPs with no matching user email", async () => {
    const userId = "user-noemail";
    const session = makeSession({ id: 43 });

    mockFrom.mockReturnValueOnce(makeBuilder([session], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, session_id: 43, reminded_at: null }], null));
    // no user rows
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips RSVP when session has no professional (advisor)", async () => {
    const userId = "user-noadvisor";
    const email = "noadvisor@example.com";
    const session = makeSession({ id: 44, professionals: null });

    mockFrom.mockReturnValueOnce(makeBuilder([session], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, session_id: 44, reminded_at: null }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("handles array-shaped professionals field by using first element", async () => {
    const userId = "user-arraypros";
    const email = "arraypros@example.com";
    const session = makeSession({
      id: 45,
      professionals: [{ name: "Bob Broker", slug: "bob-broker" }, { name: "Carol CFP", slug: "carol-cfp" }],
    });

    mockFrom.mockReturnValueOnce(makeBuilder([session], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, session_id: 45, reminded_at: null }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { html: string };
    expect(callArg.html).toContain("Bob Broker");
  });

  it("counts sends correctly across multiple sessions with RSVPs", async () => {
    const u1 = "user-s1";
    const u2 = "user-s2";
    const s1 = makeSession({ id: 101 });
    const s2 = makeSession({ id: 102, title: "Advanced ETF Q&A" });

    mockFrom.mockReturnValueOnce(makeBuilder([s1, s2], null));
    mockFrom.mockReturnValueOnce(makeBuilder([
      { user_id: u1, session_id: 101, reminded_at: null },
      { user_id: u2, session_id: 102, reminded_at: null },
    ], null));
    mockFrom.mockReturnValueOnce(makeBuilder([
      { id: u1, email: "s1user@example.com" },
      { id: u2, email: "s2user@example.com" },
    ], null));
    // Two update calls for reminded_at
    mockFrom.mockReturnValue(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("does not mark reminded_at when send fails", async () => {
    const userId = "user-sendfail";
    const email = "sendfail@example.com";
    const session = makeSession({ id: 50 });

    mockFrom.mockReturnValueOnce(makeBuilder([session], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId, session_id: 50, reminded_at: null }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));

    mockSendEmail.mockResolvedValue({ ok: false, error: "SMTP timeout" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    // No update call for reminded_at should have happened
    // (3 mockFrom calls consumed: sessions, rsvps, users — no 4th)
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });
});

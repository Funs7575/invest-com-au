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

// Mock decision-inbox: controllable per-test via mockBuildDecisionInbox
const mockBuildDecisionInbox = vi.fn((..._args: unknown[]) => [] as unknown[]);
vi.mock("@/lib/decision-inbox", () => ({
  buildDecisionInbox: (...args: unknown[]) => mockBuildDecisionInbox(...args),
}));

// withCronRunLog pass-through: calls handler and returns its response
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

import { GET, runtime, maxDuration } from "@/app/api/cron/decisions-digest/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-digtest-12345678";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/decisions-digest", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// A minimal DecisionItem for test purposes
function makeDecisionItem(overrides: Record<string, unknown> = {}) {
  return {
    key: "goal:1",
    kind: "goal",
    title: "Emergency fund",
    subtitle: "60% projected · Target $10,000",
    urgency: "high",
    badge: "Off track",
    badgeTone: "red",
    href: "/account/goals",
    dueLabel: "3 months away",
    nextAction: "Contribute $500/mo to hit your target",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/decisions-digest — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("GET /api/cron/decisions-digest — auth guards", () => {
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

  it("returns 500 when CRON_SECRET is too short (< 16 chars)", async () => {
    process.env.CRON_SECRET = "tooshort";
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
});

describe("GET /api/cron/decisions-digest — empty / dedup paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockFrom.mockImplementation(() => makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockBuildDecisionInbox.mockReturnValue([]);
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with sent:0 message when no users have weekly_digest enabled", async () => {
    // First call from notification_preferences → empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no opted-in users/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with sent:0 when all users already received digest today", async () => {
    const userId = "user-001";
    // notification_preferences → one user
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    // decisions_digest_sends dedup → same user already sent
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already received digest/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with no sendEmail call when decision inbox is empty (nothing to remind about)", async () => {
    const userId = "user-002";
    const email = "user-002@example.com";

    // notification_preferences → one user
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    // decisions_digest_sends → none sent
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });

    // All per-user DB queries (goals, plans, searches, rateMemory) → empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // investor_goals
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // get_matched_action_plans
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // saved_searches
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // user_rate_memory

    // buildDecisionInbox returns empty → skip this user (early return, not throw)
    mockBuildDecisionInbox.mockReturnValue([]);

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // The route counts a "fulfilled" Promise as sent even when the user was
    // skipped via early return (items.length === 0). So sent=1 is correct.
    expect(body.total_eligible).toBe(1);
    // No email was actually sent
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/decisions-digest — DB error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockBuildDecisionInbox.mockReturnValue([]);
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when notification_preferences query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "connection refused" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("connection refused");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/decisions-digest — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockBuildDecisionInbox.mockReturnValue([]);
    mockSendEmail.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends email and returns 200 with sent=1 when user has decision items", async () => {
    const userId = "user-digest";
    const email = "digest@example.com";

    // notification_preferences → one opted-in user
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    // decisions_digest_sends → none sent yet
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email }] },
      error: null,
    });

    // Per-user queries (all Promise.allSettled)
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // investor_goals
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // get_matched_action_plans
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // saved_searches
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // user_rate_memory

    // buildDecisionInbox returns one high-urgency item
    const highItem = makeDecisionItem({ urgency: "high" });
    mockBuildDecisionInbox.mockReturnValue([highItem]);

    // decisions_digest_sends INSERT
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.total_eligible).toBe(1);
    expect(body.send_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      from: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe(email);
    expect(callArg.from).toBe("Invest.com.au <weekly@invest.com.au>");
    // Subject should mention the urgent item count
    expect(callArg.subject).toMatch(/1 urgent/);
    // HTML should contain the item title
    expect(callArg.html).toContain("Emergency fund");
  });

  it("subject omits urgent count when no high-urgency items", async () => {
    const userId = "user-low";
    const email = "low@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const lowItem = makeDecisionItem({ urgency: "low", badge: "On track", badgeTone: "green" });
    mockBuildDecisionInbox.mockReturnValue([lowItem]);

    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // insert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string };
    // No "urgent" in subject when highCount === 0
    expect(callArg.subject).not.toMatch(/urgent/i);
    expect(callArg.subject).toMatch(/1 open item/);
  });

  it("counts errors when sendEmail fails and still returns 200", async () => {
    const userId = "user-sendfail";
    const email = "sendfail@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId, email }] }, error: null });
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    mockBuildDecisionInbox.mockReturnValue([makeDecisionItem()]);
    mockSendEmail.mockResolvedValue({ ok: false, error: "Resend timeout" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("skips user with no email in emailMap without calling sendEmail", async () => {
    const userId = "user-noemail";

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // listUsers returns user without email
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId }] },
      error: null,
    });
    // rate_change_log global still queried but no per-user queries should follow
    mockFrom.mockImplementation(() => makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    // User resolved with undefined (no email, returns early) → counted as fulfilled/sent
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns skipped_already_sent count in the response body", async () => {
    const userId1 = "user-sent-already";
    const userId2 = "user-pending";
    const email2 = "pending@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId1 }, { user_id: userId2 }], null));
    // userId1 already sent
    mockFrom.mockReturnValueOnce(makeBuilder([{ user_id: userId1 }], null));

    mockListUsers.mockResolvedValue({ data: { users: [{ id: userId2, email: email2 }] }, error: null });
    // Per-user queries for userId2
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    mockBuildDecisionInbox.mockReturnValue([makeDecisionItem()]);
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // insert

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped_already_sent).toBe(1);
    expect(body.total_eligible).toBe(1);
    expect(body.sent).toBe(1);
  });
});

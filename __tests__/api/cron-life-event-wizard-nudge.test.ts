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

// Use real LIFE_EVENTS and checklist so we can construct valid wizard rows
// (these are pure data, no side effects).
vi.mock("@/lib/life-events", async (importOriginal) => {
  return await importOriginal<typeof import("@/lib/life-events")>();
});

vi.mock("@/lib/life-event-checklist", async (importOriginal) => {
  return await importOriginal<typeof import("@/lib/life-event-checklist")>();
});

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

import { GET, runtime, maxDuration } from "@/app/api/cron/life-event-wizard-nudge/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-life-event-12345";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/life-event-wizard-nudge", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

/** Create a wizard row with partial progress for buying_first_home (has 6 steps; done 2) */
function makeWizardRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "user-001",
    life_event_id: "buying_first_home",
    step: 2,
    // Only first step done — partial progress
    form_data: { completed: ["check_eligibility"] },
    updated_at: new Date(Date.now() - 8 * 86_400_000).toISOString(), // 8 days ago
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/life-event-wizard-nudge — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("GET /api/cron/life-event-wizard-nudge — auth guards", () => {
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

describe("GET /api/cron/life-event-wizard-nudge — DB error path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when life_event_wizard_state query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "DB error" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/life-event-wizard-nudge — empty data paths", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with no-wizard message when no stale wizards", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no stale/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with sent:0 when rows have no partial progress (completed all steps)", async () => {
    // buying_first_home has 6 steps; mark all done
    const allSteps = ["check_eligibility", "budget", "pre_approval", "find_broker", "conveyancer", "building_inspection"];
    const row = makeWizardRow({ form_data: { completed: allSteps } });
    mockFrom.mockReturnValueOnce(makeBuilder([row], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no stale/i);
  });

  it("returns 200 with sent:0 when rows have no progress at all (done=0)", async () => {
    const row = makeWizardRow({ form_data: { completed: [] } });
    mockFrom.mockReturnValueOnce(makeBuilder([row], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // done=0 → filtered out (not partial)
    expect(body.sent).toBe(0);
  });
});

describe("GET /api/cron/life-event-wizard-nudge — success path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockSendEmail.mockResolvedValue({ ok: true });
    mockFrom.mockImplementation((..._args: unknown[]) => makeBuilder());
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends nudge email for partial-progress wizard", async () => {
    const userId = "user-partial";
    const email = "partial@example.com";
    const row = makeWizardRow({ user_id: userId });

    // life_event_wizard_state
    mockFrom.mockReturnValueOnce(makeBuilder([row], null));
    // auth.users
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      from: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe(email);
    expect(callArg.from).toContain("reminders@invest.com.au");
    expect(callArg.subject).toMatch(/checklist/i);
    expect(callArg.html).toContain("Buying My First Home");
    expect(callArg.html).toContain("1 of 6 steps");
  });

  it("groups multiple wizards per user into a single email", async () => {
    const userId = "user-multi";
    const email = "multi@example.com";
    const row1 = makeWizardRow({ user_id: userId, life_event_id: "buying_first_home" });
    const row2 = makeWizardRow({
      user_id: userId,
      life_event_id: "getting_married",
      form_data: { completed: ["combine_finances"] },
    });

    mockFrom.mockReturnValueOnce(makeBuilder([row1, row2], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1); // one email for two wizards
    expect(mockSendEmail).toHaveBeenCalledOnce();

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string; html: string };
    expect(callArg.subject).toMatch(/2 in-progress/i);
  });

  it("skips user with no email and increments skipped", async () => {
    const userId = "user-noemail";
    const row = makeWizardRow({ user_id: userId });

    mockFrom.mockReturnValueOnce(makeBuilder([row], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // no user rows

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("handles send failure gracefully (continues, does not count sent)", async () => {
    const userId = "user-sendfail";
    const email = "fail@example.com";
    const row = makeWizardRow({ user_id: userId });

    mockFrom.mockReturnValueOnce(makeBuilder([row], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));

    mockSendEmail.mockResolvedValue({ ok: false, error: "Resend timeout" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it("uses singular subject line for single wizard", async () => {
    const userId = "user-single";
    const email = "single@example.com";
    const row = makeWizardRow({ user_id: userId });

    mockFrom.mockReturnValueOnce(makeBuilder([row], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));

    await GET(authedReq());
    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string };
    expect(callArg.subject).toMatch(/checklist is waiting/i);
    expect(callArg.subject).not.toMatch(/checklists/i);
  });
});

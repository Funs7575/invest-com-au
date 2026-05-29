import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: unknown) => String(s ?? "")),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

const mockIsFlagEnabled = vi.fn(async (..._args: unknown[]): Promise<boolean> => true);
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

const mockSendEmail = vi.fn(
  async (..._args: unknown[]): Promise<{ ok: boolean; error?: string }> => ({ ok: true }),
);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: vi.fn(
    (_name: string, fn: (req: NextRequest) => Promise<unknown>) => fn,
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

import { GET, runtime, maxDuration } from "@/app/api/cron/switching-review-reminders/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-switching-rev-678";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/switching-review-reminders", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/switching-review-reminders — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 120", () => {
    expect(maxDuration).toBe(120);
  });
});

describe("GET /api/cron/switching-review-reminders — auth guards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "re_test_key";
    mockIsFlagEnabled.mockResolvedValue(true);
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
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
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/switching-review-reminders — kill-switch / skips", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "re_test_key";
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("returns 200 skipped=kill_switch_email_drip_send when flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_email_drip_send");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 skipped=no_resend_api_key when RESEND_API_KEY is not set", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    delete process.env.RESEND_API_KEY;

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("no_resend_api_key");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/switching-review-reminders — empty data path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "re_test_key";
    mockIsFlagEnabled.mockResolvedValue(true);
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("returns 200 with considered:0 when no products due for review", async () => {
    // user_current_products → empty
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.considered).toBe(0);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/switching-review-reminders — DB error paths", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "re_test_key";
    mockIsFlagEnabled.mockResolvedValue(true);
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("returns 500 when user_current_products query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "DB unavailable" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when profiles query fails", async () => {
    const products = [
      {
        id: "p1",
        user_id: "u1",
        product_kind: "broker",
        broker_name: "CommSec",
        started_at: "2020-01-01",
        last_review_reminder_at: null,
      },
    ];
    mockFrom.mockReturnValueOnce(makeBuilder(products, null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "profiles unavailable" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });
});

describe("GET /api/cron/switching-review-reminders — success path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "re_test_key";
    mockIsFlagEnabled.mockResolvedValue(true);
    mockSendEmail.mockResolvedValue({ ok: true });
    mockFrom.mockImplementation((..._args: unknown[]) => makeBuilder());
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("sends email and updates last_review_reminder_at when a user is due", async () => {
    const userId = "user-due-001";
    const email = "due@example.com";

    const products = [
      {
        id: "prod-1",
        user_id: userId,
        product_kind: "broker",
        broker_name: "CommSec",
        started_at: "2023-01-01",
        last_review_reminder_at: null,
      },
    ];
    const profiles = [{ id: userId, email }];

    // user_current_products
    mockFrom.mockReturnValueOnce(makeBuilder(products, null));
    // profiles
    mockFrom.mockReturnValueOnce(makeBuilder(profiles, null));
    // email_suppression_list (empty)
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    // update last_review_reminder_at
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.considered).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as { to: string; subject: string; html: string };
    expect(callArg.to).toBe(email);
    expect(callArg.subject).toMatch(/review/i);
    expect(callArg.html).toContain("CommSec");
  });

  it("skips suppressed email addresses", async () => {
    const userId = "user-suppressed";
    const email = "suppressed@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([
      { id: "p2", user_id: userId, product_kind: "savings_account", broker_name: "ING", started_at: "2023-01-01", last_review_reminder_at: null },
    ], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));
    // suppression list contains this email
    mockFrom.mockReturnValueOnce(makeBuilder([{ email }], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("handles sendEmail failure gracefully (increments errors, not sent)", async () => {
    const userId = "user-err";
    const email = "err@example.com";

    mockFrom.mockReturnValueOnce(makeBuilder([
      { id: "p3", user_id: userId, product_kind: "broker", broker_name: "Pearler", started_at: "2023-01-01", last_review_reminder_at: null },
    ], null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    mockSendEmail.mockResolvedValue({ ok: false, error: "Resend error" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("groups multiple products per user into a single email", async () => {
    const userId = "user-multi";
    const email = "multi@example.com";

    const products = [
      { id: "p4", user_id: userId, product_kind: "broker", broker_name: "CommSec", started_at: "2023-01-01", last_review_reminder_at: null },
      { id: "p5", user_id: userId, product_kind: "savings_account", broker_name: "ING", started_at: "2022-06-01", last_review_reminder_at: null },
    ];

    mockFrom.mockReturnValueOnce(makeBuilder(products, null));
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    // Only one email for both products
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as { html: string };
    expect(callArg.html).toContain("CommSec");
    expect(callArg.html).toContain("ING");
  });

  it("skips users with no email in profiles", async () => {
    const userId = "user-noemail";

    mockFrom.mockReturnValueOnce(makeBuilder([
      { id: "p6", user_id: userId, product_kind: "broker", broker_name: "Stake", started_at: "2023-01-01", last_review_reminder_at: null },
    ], null));
    // profiles with no email
    mockFrom.mockReturnValueOnce(makeBuilder([{ id: userId, email: null }], null));
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.no_email).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

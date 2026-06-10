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

vi.mock("@/lib/course-certificates", () => ({
  cpdYearFor: vi.fn((_date: unknown) => 2026),
}));

const mockSendEmail = vi.fn(
  async (..._args: unknown[]): Promise<{ ok: boolean; error?: string }> => ({ ok: true }),
);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
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
    auth: {
      admin: {
        listUsers: vi.fn(
          async (..._a: unknown[]): Promise<{ data: { users: Array<{ id: string; email?: string }> }; error: unknown }> => ({
            data: { users: [] },
            error: null,
          }),
        ),
      },
    },
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/cpd-reminder/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-cpd-remind-123456";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/cpd-reminder", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/cpd-reminder — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 120", () => {
    expect(maxDuration).toBe(120);
  });
});

describe("GET /api/cron/cpd-reminder — auth guards", () => {
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

describe("GET /api/cron/cpd-reminder — DB error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when cpd_credits query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "cpd_credits down" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("cpd_fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when professionals query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // cpd_credits ok
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "professionals down" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("advisor_fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/cpd-reminder — empty data path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with sent:0 when no advisors exist", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // cpd_credits
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // professionals

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(0);
    expect(body.cpd_year).toBe(2026);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips advisor who has >= 30 hours (above threshold)", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 1, hours: 35 }], null),
    ); // cpd_credits
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ id: 1, name: "John Smith", email: "john@example.com" }], null),
    ); // professionals

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips advisor with no email", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // cpd_credits (no record = 0 hours)
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ id: 2, name: "No Email", email: null }], null),
    ); // professionals

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/cpd-reminder — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockSendEmail.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends email and returns sent:1 for advisor below threshold", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 10, hours: 20 }], null),
    ); // cpd_credits: 20 hours
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ id: 10, name: "Jane Doe", email: "jane@example.com" }], null),
    ); // professionals

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.cpd_year).toBe(2026);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      from: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(callArg.to).toBe("jane@example.com");
    expect(callArg.from).toBe("Invest.com.au <advisors@invest.com.au>");
    expect(callArg.subject).toContain("CPD reminder");
    expect(callArg.subject).toContain("2026");
    expect(callArg.html).toContain("Jane");
    expect(callArg.text).toContain("Jane");
  });

  it("sends email when advisor has 0 hours (not in cpd_credits)", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // no cpd_credits rows
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ id: 11, name: "Zero Hours", email: "zero@example.com" }], null),
    );

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string };
    expect(callArg.subject).toContain("40 hours");
  });

  it("counts send failures without throwing", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "Resend timeout" });

    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // cpd_credits
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ id: 12, name: "Fail User", email: "fail@example.com" }], null),
    );

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // send failed → not counted in sent, but no throw
    expect(body.sent).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it("sends to multiple advisors below threshold", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [
          { professional_id: 20, hours: 10 },
          { professional_id: 21, hours: 5 },
        ],
        null,
      ),
    );
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [
          { id: 20, name: "Advisor A", email: "a@example.com" },
          { id: 21, name: "Advisor B", email: "b@example.com" },
        ],
        null,
      ),
    );

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });
});

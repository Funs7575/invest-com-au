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
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/advisor-welcome-sequence/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-welcome-seq-12345";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/advisor-welcome-sequence", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/advisor-welcome-sequence — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 120", () => {
    expect(maxDuration).toBe(120);
  });
});

describe("GET /api/cron/advisor-welcome-sequence — auth guards", () => {
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

  it("returns 500 when CRON_SECRET is too short", async () => {
    process.env.CRON_SECRET = "tooshort";
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
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

describe("GET /api/cron/advisor-welcome-sequence — DB error path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when professionals query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "db connection failed" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/advisor-welcome-sequence — empty data path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with sent:0 when no eligible advisors", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // no advisors in window

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.checked).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips advisor with null email (guard inside loop)", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ id: 1, name: "No Email", email: null, slug: "no-email" }], null),
    );

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/advisor-welcome-sequence — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockSendEmail.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends welcome email and updates professionals table", async () => {
    // First call: SELECT query
    const selectBuilder = makeBuilder(
      [{ id: 10, name: "Alice Smith", email: "alice@example.com", slug: "alice-smith" }],
      null,
    );
    mockFrom.mockReturnValueOnce(selectBuilder);
    // Second call: UPDATE professionals (mark welcome_email_sent_at)
    const updateBuilder = makeBuilder(null, null);
    mockFrom.mockReturnValueOnce(updateBuilder);

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.checked).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      from: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(callArg.to).toBe("alice@example.com");
    expect(callArg.from).toBe("Invest.com.au <advisors@invest.com.au>");
    expect(callArg.subject).toContain("Welcome to Invest.com.au");
    expect(callArg.html).toContain("Alice");
    expect(callArg.html).toContain("alice-smith");
  });

  it("uses /advisor-portal URL when advisor has no slug", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ id: 11, name: "Bob Noslug", email: "bob@example.com", slug: null }], null),
    );
    mockFrom.mockReturnValueOnce(makeBuilder(null, null)); // update

    const res = await GET(authedReq());
    expect(res.status).toBe(200);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { html: string; text: string };
    expect(callArg.html).toContain("/advisor-portal");
    expect(callArg.text).toContain("/advisor-portal");
  });

  it("counts failure when sendEmail returns ok:false", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "rate limited" });

    mockFrom.mockReturnValueOnce(
      makeBuilder([{ id: 12, name: "Fail Advisor", email: "fail@example.com", slug: "fail" }], null),
    );
    // No update call — route only updates when ok is true

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.checked).toBe(1);
  });

  it("processes multiple advisors and counts correctly", async () => {
    // Two advisors to welcome
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [
          { id: 20, name: "Advisor A", email: "a@example.com", slug: "advisor-a" },
          { id: 21, name: "Advisor B", email: "b@example.com", slug: "advisor-b" },
        ],
        null,
      ),
    );
    // Two update calls
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.checked).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });
});

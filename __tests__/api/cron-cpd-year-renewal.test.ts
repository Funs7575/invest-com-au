import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

const mockCpdYearFor = vi.fn((..._a: unknown[]): number => 2026);
vi.mock("@/lib/course-certificates", () => ({
  cpdYearFor: (...args: unknown[]) => mockCpdYearFor(...args),
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
    async (_name: string, fn: () => Promise<{ response: unknown; stats?: Record<string, unknown> }>) => {
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
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/cpd-year-renewal/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-cpd-year-renewal12";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/cpd-year-renewal", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// Fix the Date so tests see July (UTC month = 6)
function stubJuly() {
  vi.setSystemTime(new Date("2026-07-01T06:00:00.000Z"));
}

function stubNonJuly() {
  vi.setSystemTime(new Date("2026-05-15T08:00:00.000Z"));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/cpd-year-renewal — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 120", () => {
    expect(maxDuration).toBe(120);
  });
});

describe("GET /api/cron/cpd-year-renewal — auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    vi.useFakeTimers();
    stubJuly();
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

  it("returns 500 when CRON_SECRET is too short", async () => {
    process.env.CRON_SECRET = "tooshort";
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer bad-token" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/cpd-year-renewal — skip non-July path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    vi.useFakeTimers();
    stubNonJuly();
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("returns 200 with skipped:true when not July", async () => {
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.reason).toMatch(/not july/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/cpd-year-renewal — DB error paths (July)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    vi.useFakeTimers();
    stubJuly();
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("returns 500 when advisor_badges query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "badges table down" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when professionals query fails", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 1 }], null),
    ); // advisor_badges ok
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "professionals down" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/cpd-year-renewal — empty data path (July)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    vi.useFakeTimers();
    stubJuly();
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("returns 200 with sent:0 when no badges exist", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // advisor_badges: empty

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with sent:0 when badge holders have no active email", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 100 }], null),
    ); // advisor_badges
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // professionals (no active advisors with email)

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/cpd-year-renewal — success path (July)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    vi.useFakeTimers();
    stubJuly();
    mockSendEmail.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("sends renewal email and returns sent:1", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 5 }], null),
    ); // advisor_badges
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [{ id: 5, name: "Alice Smith", email: "alice@example.com" }],
        null,
      ),
    ); // professionals

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe("alice@example.com");
    expect(callArg.subject).toContain("CPD year");
    expect(callArg.html).toContain("Alice");
  });

  it("still counts sent even when sendEmail throws (caught per-advisor)", async () => {
    mockSendEmail.mockRejectedValue(new Error("Send error"));

    mockFrom.mockReturnValueOnce(
      makeBuilder([{ professional_id: 6 }], null),
    ); // advisor_badges
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [{ id: 6, name: "Bob Jones", email: "bob@example.com" }],
        null,
      ),
    ); // professionals

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // error was caught per-advisor — sent stays 0 but no 500
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
  });

  it("deduplicates badge rows for same professional_id", async () => {
    // Two badge rows for the same professional
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [{ professional_id: 7 }, { professional_id: 7 }],
        null,
      ),
    ); // advisor_badges
    mockFrom.mockReturnValueOnce(
      makeBuilder(
        [{ id: 7, name: "Carol Lee", email: "carol@example.com" }],
        null,
      ),
    ); // professionals — only 1 advisor row

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    // Only 1 email should be sent (dedup via Set)
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });
});

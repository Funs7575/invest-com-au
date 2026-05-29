import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: unknown) => String(s ?? "")),
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

const mockSendEmail = vi.fn(
  async (..._args: unknown[]): Promise<{ ok: boolean; error?: string }> => ({ ok: true }),
);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockBuildEmailToUserIdMap = vi.fn(
  async (..._args: unknown[]): Promise<Map<string, string>> => new Map(),
);
vi.mock("@/lib/notifications", () => ({
  buildEmailToUserIdMap: (...args: unknown[]) => mockBuildEmailToUserIdMap(...args),
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

function makeBuilder(data: unknown = null, error: unknown = null, count: number | null = null) {
  const terminal = { data, error, count };
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

import { GET, runtime, maxDuration } from "@/app/api/cron/review-social-loop/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-review-sl-12345";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/review-social-loop", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/review-social-loop — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("GET /api/cron/review-social-loop — auth guards", () => {
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

describe("GET /api/cron/review-social-loop — empty data path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with sent:0 and badged:0 when no recent reviews", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.badged).toBe(0);
    expect(body.checked).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/review-social-loop — DB error path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when user_reviews fetch fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "connection timeout" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/review-social-loop — success path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockSendEmail.mockResolvedValue({ ok: true });
    mockFrom.mockImplementation((..._args: unknown[]) => makeBuilder());
    mockBuildEmailToUserIdMap.mockResolvedValue(new Map());
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends email and returns 200 with sent=1 for single review", async () => {
    const email = "reviewer@example.com";
    const recentRows = [{ email, broker_slug: "commsec", rating: 5 }];

    // recent reviews fetch
    mockFrom.mockReturnValueOnce(makeBuilder(recentRows, null));
    // total count query
    mockFrom.mockReturnValueOnce(makeBuilder(null, null, 2));
    // forum_user_profiles upsert (no badge threshold yet — count=2 < 3)
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    // buildEmailToUserIdMap returns no match (no userId → no badge logic)
    mockBuildEmailToUserIdMap.mockResolvedValue(new Map());

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.checked).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      from: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe(email);
    expect(callArg.from).toContain("invest.com.au");
    expect(callArg.html).toContain("Commsec");
  });

  it("grants contributor badge when user has >= 3 approved reviews", async () => {
    const email = "contributor@example.com";
    const userId = "user-contrib-001";
    const recentRows = [{ email, broker_slug: "pearler", rating: 4 }];

    // recent reviews
    mockFrom.mockReturnValueOnce(makeBuilder(recentRows, null));
    // count query returns 3 → contributor threshold
    mockFrom.mockReturnValueOnce(makeBuilder(null, null, 3));

    // buildEmailToUserIdMap returns a match
    mockBuildEmailToUserIdMap.mockResolvedValue(new Map([[email, userId]]));

    // forum_user_profiles upsert (ensure row exists)
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));
    // select badge → no current badge
    mockFrom.mockReturnValueOnce(makeBuilder({ badge: null }, null));
    // update badge
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.badged).toBe(1);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0]?.[0] as { html: string };
    expect(callArg.html).toContain("Contributor");
  });

  it("grants expert badge when user has >= 10 approved reviews", async () => {
    const email = "expert@example.com";
    const userId = "user-expert-001";
    const recentRows = [{ email, broker_slug: "selfwealth", rating: 5 }];

    // recent reviews
    mockFrom.mockReturnValueOnce(makeBuilder(recentRows, null));
    // count = 10 → expert
    mockFrom.mockReturnValueOnce(makeBuilder(null, null, 10));

    mockBuildEmailToUserIdMap.mockResolvedValue(new Map([[email, userId]]));

    // forum_user_profiles upsert
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));
    // select badge → contributor currently (rank 1)
    mockFrom.mockReturnValueOnce(makeBuilder({ badge: "contributor" }, null));
    // update to expert
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badged).toBe(1);
    expect(body.sent).toBe(1);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { html: string };
    expect(callArg.html).toContain("Expert");
  });

  it("does not downgrade a moderator badge", async () => {
    const email = "moderator@example.com";
    const userId = "user-mod-001";
    const recentRows = [{ email, broker_slug: "stake", rating: 5 }];

    mockFrom.mockReturnValueOnce(makeBuilder(recentRows, null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null, 3));

    mockBuildEmailToUserIdMap.mockResolvedValue(new Map([[email, userId]]));

    // upsert ensure row
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));
    // badge = moderator (rank 3, higher than contributor rank 1)
    mockFrom.mockReturnValueOnce(makeBuilder({ badge: "moderator" }, null));
    // no update should be called

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // badge not granted (moderator > contributor)
    expect(body.badged).toBe(0);
    expect(body.sent).toBe(1);
  });

  it("deduplicates emails — one email per run for same reviewer", async () => {
    const email = "dup@example.com";
    const recentRows = [
      { email, broker_slug: "commsec", rating: 5 },
      { email, broker_slug: "pearler", rating: 4 }, // duplicate email
    ];

    mockFrom.mockReturnValueOnce(makeBuilder(recentRows, null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null, 2));
    mockBuildEmailToUserIdMap.mockResolvedValue(new Map());

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // checked = unique emails = 1 (dedup)
    expect(body.checked).toBe(1);
    // only one email sent
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it("counts errors but still returns ok:true when sendEmail fails", async () => {
    const email = "failed@example.com";
    mockFrom.mockReturnValueOnce(makeBuilder([{ email, broker_slug: "raiz", rating: 3 }], null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null, 1));
    mockBuildEmailToUserIdMap.mockResolvedValue(new Map());

    mockSendEmail.mockResolvedValue({ ok: false, error: "Resend timeout" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // sent should not be incremented
    expect(body.sent).toBe(0);
  });

  it("uses singular subject when first review", async () => {
    const email = "firstrev@example.com";
    mockFrom.mockReturnValueOnce(makeBuilder([{ email, broker_slug: "spaceship", rating: 5 }], null));
    mockFrom.mockReturnValueOnce(makeBuilder(null, null, 1));
    mockBuildEmailToUserIdMap.mockResolvedValue(new Map());

    const res = await GET(authedReq());
    expect(res.status).toBe(200);

    const callArg = mockSendEmail.mock.calls[0]?.[0] as { subject: string };
    expect(callArg.subject).toMatch(/first review/i);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
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

import { GET, runtime, maxDuration } from "@/app/api/cron/market-event-reminders/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-market-events-123";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/market-event-reminders", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

const SAMPLE_EVENT = {
  id: 1,
  event_date: "2026-05-30",
  event_type: "rba",
  title: "RBA Rate Decision",
  description: "Reserve Bank of Australia announces cash rate decision for May.",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/market-event-reminders — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 30", () => {
    expect(maxDuration).toBe(30);
  });
});

describe("GET /api/cron/market-event-reminders — auth guards", () => {
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
    process.env.CRON_SECRET = "tiny";
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

describe("GET /api/cron/market-event-reminders — DB error path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when market_events query fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "db timeout" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });
});

describe("GET /api/cron/market-event-reminders — empty data path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with pushed:0 when no events tomorrow", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pushed).toBe(0);
    expect(body.events).toBe(0);
  });
});

describe("GET /api/cron/market-event-reminders — push paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.ADMIN_API_KEY;
  });

  it("returns pushed:0 when ADMIN_API_KEY is not set (sendPush returns false)", async () => {
    delete process.env.ADMIN_API_KEY;
    mockFrom.mockReturnValueOnce(makeBuilder([SAMPLE_EVENT], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.events).toBe(1);
    expect(body.pushed).toBe(0);
  });

  it("returns pushed:1 when fetch succeeds for the event", async () => {
    process.env.ADMIN_API_KEY = "test-admin-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (..._args: unknown[]): Promise<{ ok: boolean }> => ({ ok: true }),
      ),
    );

    mockFrom.mockReturnValueOnce(makeBuilder([SAMPLE_EVENT], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pushed).toBe(1);
    expect(body.events).toBe(1);

    vi.unstubAllGlobals();
  });

  it("returns pushed:0 when fetch fails for the event", async () => {
    process.env.ADMIN_API_KEY = "test-admin-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (..._args: unknown[]): Promise<{ ok: boolean }> => ({ ok: false }),
      ),
    );

    mockFrom.mockReturnValueOnce(makeBuilder([SAMPLE_EVENT], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(0);
    expect(body.events).toBe(1);

    vi.unstubAllGlobals();
  });

  it("returns pushed:0 when fetch throws (network error)", async () => {
    process.env.ADMIN_API_KEY = "test-admin-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (..._args: unknown[]): Promise<never> => {
        throw new Error("network error");
      }),
    );

    mockFrom.mockReturnValueOnce(makeBuilder([SAMPLE_EVENT], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(0);
    expect(body.events).toBe(1);

    vi.unstubAllGlobals();
  });

  it("handles multiple events and counts each push result independently", async () => {
    process.env.ADMIN_API_KEY = "test-admin-key";
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (..._args: unknown[]): Promise<{ ok: boolean }> => {
        callCount++;
        // First event succeeds, second fails
        return { ok: callCount === 1 };
      }),
    );

    const event2 = { ...SAMPLE_EVENT, id: 2, event_type: "asx", title: "ASX Earnings" };
    mockFrom.mockReturnValueOnce(makeBuilder([SAMPLE_EVENT, event2], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toBe(2);
    expect(body.pushed).toBe(1);

    vi.unstubAllGlobals();
  });
});

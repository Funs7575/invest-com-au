import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
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
  const terminal = { data, error, count: null };
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

import { GET, runtime, maxDuration } from "@/app/api/cron/rate-change-digest/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-ratechange-12345";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/rate-change-digest", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

function makeBatchRow(capturedAt: string) {
  return { captured_at: capturedAt };
}

function makeSnapshotRow(brokerId: number, productKind: string, rateBps: number, capturedAt: string, brokerSlug = "ing", brokerName = "ING") {
  return {
    broker_id: brokerId,
    product_kind: productKind,
    rate_bps: rateBps,
    captured_at: capturedAt,
    brokers: { slug: brokerSlug, name: brokerName },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/rate-change-digest — exports", () => {
  it("exports runtime = 'nodejs'", () => {
    expect(runtime).toBe("nodejs");
  });

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("GET /api/cron/rate-change-digest — auth guards", () => {
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

  it("returns 500 when CRON_SECRET is too short", async () => {
    process.env.CRON_SECRET = "tooshort";
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
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

describe("GET /api/cron/rate-change-digest — no-data paths", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 200 with reason=no_data when snapshots table is empty", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder([], null)); // batches query

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reason).toBe("no_data");
    expect(body.changes).toBe(0);
  });

  it("returns 200 with reason=no_data when batches query errors", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "table missing" }));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reason).toBe("no_data");
    expect(body.changes).toBe(0);
  });

  it("returns 200 with reason=single_batch when only one distinct captured_at", async () => {
    const at = "2026-05-28T12:00:00Z";
    // All rows same timestamp → only 1 distinct
    mockFrom.mockReturnValueOnce(makeBuilder([makeBatchRow(at), makeBatchRow(at)], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reason).toBe("single_batch");
    expect(body.changes).toBe(0);
  });

  it("returns 200 with changes:0 when rates are identical between batches", async () => {
    const newerAt = "2026-05-28T12:00:00Z";
    const olderAt = "2026-05-27T12:00:00Z";

    // batches: two distinct timestamps
    mockFrom.mockReturnValueOnce(makeBuilder([makeBatchRow(newerAt), makeBatchRow(olderAt)], null));

    // newest batch: ING 500 bps
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 500, newerAt)], null));
    // previous batch: ING 500 bps (same rate — no change)
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 500, olderAt)], null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.changes).toBe(0);
  });
});

describe("GET /api/cron/rate-change-digest — success path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockFrom.mockImplementation((..._args: unknown[]) => makeBuilder());
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("detects rate increase and inserts change log row", async () => {
    const newerAt = "2026-05-28T12:00:00Z";
    const olderAt = "2026-05-27T12:00:00Z";

    mockFrom.mockReturnValueOnce(makeBuilder([makeBatchRow(newerAt), makeBatchRow(olderAt)], null));
    // newest: 550 bps
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 550, newerAt)], null));
    // previous: 500 bps → delta = 50, direction = "up"
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 500, olderAt)], null));
    // upsert rate_change_log → success
    mockFrom.mockReturnValueOnce({ ...makeBuilder(null, null), count: 1 });
    // feed_events fanout → success
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.changes).toBe(1);
    expect(body.newestAt).toBe(newerAt);
    expect(body.previousAt).toBe(olderAt);
  });

  it("detects rate decrease (direction=down)", async () => {
    const newerAt = "2026-05-28T12:00:00Z";
    const olderAt = "2026-05-27T12:00:00Z";

    mockFrom.mockReturnValueOnce(makeBuilder([makeBatchRow(newerAt), makeBatchRow(olderAt)], null));
    // newest: 400 bps (dropped)
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 400, newerAt)], null));
    // previous: 500 bps
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 500, olderAt)], null));

    // Capture upsert to verify direction
    let capturedInsertRows: unknown = null;
    const upsertBuilder = { ...makeBuilder(null, null), count: 1 };
    (upsertBuilder as Record<string, unknown>)["upsert"] = vi.fn((data: unknown) => {
      capturedInsertRows = data;
      return upsertBuilder;
    });
    mockFrom.mockReturnValueOnce(upsertBuilder);
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.changes).toBe(1);

    const rows = capturedInsertRows as Array<{ direction: string; delta_bps: number }>;
    expect(rows[0]?.direction).toBe("down");
    expect(rows[0]?.delta_bps).toBe(-100);
  });

  it("marks new broker as direction=new when not in previous batch", async () => {
    const newerAt = "2026-05-28T12:00:00Z";
    const olderAt = "2026-05-27T12:00:00Z";

    mockFrom.mockReturnValueOnce(makeBuilder([makeBatchRow(newerAt), makeBatchRow(olderAt)], null));
    // newest: broker 99 (new)
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(99, "savings_account", 500, newerAt, "newbank", "New Bank")], null));
    // previous: empty — broker 99 didn't exist
    mockFrom.mockReturnValueOnce(makeBuilder([], null));

    let capturedInsertRows: unknown = null;
    const upsertBuilder = { ...makeBuilder(null, null), count: 1 };
    (upsertBuilder as Record<string, unknown>)["upsert"] = vi.fn((data: unknown) => {
      capturedInsertRows = data;
      return upsertBuilder;
    });
    mockFrom.mockReturnValueOnce(upsertBuilder);
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.changes).toBe(1);

    const rows = capturedInsertRows as Array<{ direction: string; old_rate_bps: number | null }>;
    expect(rows[0]?.direction).toBe("new");
    expect(rows[0]?.old_rate_bps).toBeNull();
  });

  it("returns 500 when rate_change_log upsert fails", async () => {
    const newerAt = "2026-05-28T12:00:00Z";
    const olderAt = "2026-05-27T12:00:00Z";

    mockFrom.mockReturnValueOnce(makeBuilder([makeBatchRow(newerAt), makeBatchRow(olderAt)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 550, newerAt)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 500, olderAt)], null));

    // upsert fails
    mockFrom.mockReturnValueOnce({ ...makeBuilder(null, { message: "unique violation" }), count: null });

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it("logs feed_events fanout failure as non-blocking (still returns ok)", async () => {
    const newerAt = "2026-05-28T12:00:00Z";
    const olderAt = "2026-05-27T12:00:00Z";

    mockFrom.mockReturnValueOnce(makeBuilder([makeBatchRow(newerAt), makeBatchRow(olderAt)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 550, newerAt)], null));
    mockFrom.mockReturnValueOnce(makeBuilder([makeSnapshotRow(1, "savings_account", 500, olderAt)], null));
    // upsert rate_change_log success
    mockFrom.mockReturnValueOnce({ ...makeBuilder(null, null), count: 1 });
    // feed_events fanout fails (non-blocking)
    mockFrom.mockReturnValueOnce(makeBuilder(null, { message: "fanout error" }));

    const res = await GET(authedReq());
    // Still 200 — fanout failure is non-blocking
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.changes).toBe(1);
  });

  it("handles multiple broker changes in one run", async () => {
    const newerAt = "2026-05-28T12:00:00Z";
    const olderAt = "2026-05-27T12:00:00Z";

    mockFrom.mockReturnValueOnce(makeBuilder([makeBatchRow(newerAt), makeBatchRow(olderAt)], null));
    // newest: ING up, UBank down
    mockFrom.mockReturnValueOnce(makeBuilder([
      makeSnapshotRow(1, "savings_account", 550, newerAt, "ing", "ING"),
      makeSnapshotRow(2, "savings_account", 380, newerAt, "ubank", "UBank"),
    ], null));
    // previous
    mockFrom.mockReturnValueOnce(makeBuilder([
      makeSnapshotRow(1, "savings_account", 500, olderAt, "ing", "ING"),
      makeSnapshotRow(2, "savings_account", 420, olderAt, "ubank", "UBank"),
    ], null));

    mockFrom.mockReturnValueOnce({ ...makeBuilder(null, null), count: 2 });
    mockFrom.mockReturnValueOnce(makeBuilder(null, null));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.changes).toBe(2);
  });
});

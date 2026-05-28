/**
 * Tests for GET /api/cron/prune-rate-history
 *
 * Covers:
 *   - requireCronAuth gate (401 / 500 on bad/missing secret)
 *   - Both tables pruned and counts returned in response
 *   - Fetch error on either table logs error but does not crash the handler
 *   - Delete error on either table logs error but does not crash the handler
 *   - Empty tables are a no-op (zero deletes, zero anchors)
 *   - maxDuration export value
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(async (_name: string, fn: () => Promise<{ response: unknown }>) => {
    const { response } = await fn();
    return response;
  }),
  wrapCronHandler: vi.fn(
    (_name: string, handler: (req: unknown) => Promise<unknown>) => handler,
  ),
  cleanupCronRunLog: vi.fn(() => Promise.resolve(0)),
}));

import { GET, maxDuration } from "@/app/api/cron/prune-rate-history/route";

// ─── Supabase builder helpers ─────────────────────────────────────────────────

/**
 * Builds a chainable Supabase-like query builder.
 *
 * `selectResult`  — resolved value for the SELECT query.
 * `deleteResult`  — resolved value for the DELETE query.
 */
function makeBuilder(
  selectResult: { data: unknown; error: unknown } = { data: [], error: null },
  deleteResult: { error: unknown } = { error: null },
) {
  const builder: Record<string, unknown> = {};

  // Terminal select resolves via .then()
  builder.then = (cb: (v: unknown) => unknown) =>
    Promise.resolve(cb(selectResult));

  // Chainable query methods
  for (const m of ["select", "lt", "limit", "order", "eq"]) {
    builder[m] = vi.fn(() => builder);
  }

  // .delete() returns a new builder that resolves with deleteResult
  builder.delete = vi.fn(() => {
    const delBuilder: Record<string, unknown> = {};
    delBuilder.in = vi.fn(() => Promise.resolve(deleteResult));
    return delBuilder;
  });

  return builder;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/prune-rate-history", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/prune-rate-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  // ── Exports ──────────────────────────────────────────────────────────────────

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });

  // ── Auth gate ─────────────────────────────────────────────────────────────────

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on a wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrong-token" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when no Authorization header is present", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  // ── Empty tables ──────────────────────────────────────────────────────────────

  it("returns 200 ok:true with zero counts when both tables are empty", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.savings_rate_snapshots_deleted).toBe(0);
    expect(body.broker_health_score_history_deleted).toBe(0);
    expect(body.savings_rate_snapshots_anchors_kept).toBe(0);
    expect(body.broker_health_score_history_anchors_kept).toBe(0);
    expect(body.retentionDays).toBe(90);
  });

  it("returns 200 ok:true when both tables return null data", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  // ── Normal pruning ────────────────────────────────────────────────────────────

  it("prunes savings_rate_snapshots and reports deleted count", async () => {
    // Two old rows for the same group in the same month → one anchor, one delete
    const savingsRows = [
      {
        id: "uuid-001",
        broker_id: 1,
        product_kind: "savings_account",
        captured_at: "2025-10-01T00:00:00Z",
      },
      {
        id: "uuid-002",
        broker_id: 1,
        product_kind: "savings_account",
        captured_at: "2025-10-15T00:00:00Z",
      },
    ];

    let savingsDeleteCalled = false;

    mockFrom.mockImplementation((table: string) => {
      if (table === "savings_rate_snapshots") {
        const b: Record<string, unknown> = {};
        b.select = vi.fn(() => b);
        b.lt = vi.fn(() => b);
        b.limit = vi.fn(() => b);
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: savingsRows, error: null }));
        b.delete = vi.fn(() => {
          savingsDeleteCalled = true;
          return { in: vi.fn(() => Promise.resolve({ error: null })) };
        });
        return b;
      }
      // broker_health_score_history — empty, no deletions
      return makeBuilder({ data: [], error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.savings_rate_snapshots_deleted).toBe(1);
    expect(body.savings_rate_snapshots_anchors_kept).toBe(1);
    expect(savingsDeleteCalled).toBe(true);
    // Health table had no old rows
    expect(body.broker_health_score_history_deleted).toBe(0);
  });

  it("prunes broker_health_score_history and reports deleted count", async () => {
    const healthRows = [
      { id: 101, broker_slug: "commsec", captured_at: "2025-09-01T00:00:00Z" },
      { id: 102, broker_slug: "commsec", captured_at: "2025-09-15T00:00:00Z" },
    ];

    let healthDeleteCalled = false;

    mockFrom.mockImplementation((table: string) => {
      if (table === "broker_health_score_history") {
        const b: Record<string, unknown> = {};
        b.select = vi.fn(() => b);
        b.lt = vi.fn(() => b);
        b.limit = vi.fn(() => b);
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: healthRows, error: null }));
        b.delete = vi.fn(() => {
          healthDeleteCalled = true;
          return { in: vi.fn(() => Promise.resolve({ error: null })) };
        });
        return b;
      }
      return makeBuilder({ data: [], error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.broker_health_score_history_deleted).toBe(1);
    expect(body.broker_health_score_history_anchors_kept).toBe(1);
    expect(healthDeleteCalled).toBe(true);
  });

  // ── Error resilience ──────────────────────────────────────────────────────────

  it("still returns 200 and prunes health table when savings fetch fails", async () => {
    const healthRows = [
      { id: 201, broker_slug: "stake", captured_at: "2025-08-01T00:00:00Z" },
      { id: 202, broker_slug: "stake", captured_at: "2025-08-10T00:00:00Z" },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "savings_rate_snapshots") {
        // Simulate a DB fetch error
        return makeBuilder({ data: null, error: { message: "connection timeout" } });
      }
      // Health table succeeds
      const b: Record<string, unknown> = {};
      b.select = vi.fn(() => b);
      b.lt = vi.fn(() => b);
      b.limit = vi.fn(() => b);
      b.then = (cb: (v: unknown) => unknown) =>
        Promise.resolve(cb({ data: healthRows, error: null }));
      b.delete = vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ error: null })),
      }));
      return b;
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Savings was errored — 0 deleted
    expect(body.savings_rate_snapshots_deleted).toBe(0);
    // Health proceeded normally
    expect(body.broker_health_score_history_deleted).toBe(1);
  });

  it("still returns 200 when a delete call errors on savings table", async () => {
    const savingsRows = [
      { id: "uuid-a", broker_id: 3, product_kind: "term_deposit", captured_at: "2025-07-01T00:00:00Z" },
      { id: "uuid-b", broker_id: 3, product_kind: "term_deposit", captured_at: "2025-07-20T00:00:00Z" },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "savings_rate_snapshots") {
        const b: Record<string, unknown> = {};
        b.select = vi.fn(() => b);
        b.lt = vi.fn(() => b);
        b.limit = vi.fn(() => b);
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: savingsRows, error: null }));
        b.delete = vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ error: { message: "delete failed" } })),
        }));
        return b;
      }
      return makeBuilder({ data: [], error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Delete errored, so count stays 0
    expect(body.savings_rate_snapshots_deleted).toBe(0);
  });

  it("returns 200 even when both tables throw an exception", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("unexpected supabase error");
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

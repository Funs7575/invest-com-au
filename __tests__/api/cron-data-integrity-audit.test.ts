import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

// Unwrap wrapCronHandler so GET is callable without touching cron_run_log.
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

// Per-table stub data. Each key maps to the rows that the table's
// chained query returns (or the { count } shortcut for head:true).
type TableStub = {
  rows?: unknown[];
  error?: { message: string } | null;
  throwOn?: "select" | "upsert";
  count?: number;
};

let stubs: Record<string, TableStub> = {};

// Capture every upsert so tests can assert on the emitted issue rows.
const upsertCalls: {
  row: Record<string, unknown>;
  options?: Record<string, unknown>;
}[] = [];

// A permissive chained-query stub — every chainable method returns
// a terminal promise that resolves to the stubbed data. The chain
// shape doesn't matter because the route only awaits at the end
// of whichever chain it builds.
function makeSelectChain(tableName: string) {
  const stub = stubs[tableName] || {};
  if (stub.throwOn === "select") {
    throw new Error(`${tableName} select threw`);
  }

  const result = {
    data: stub.error ? null : stub.rows ?? [],
    error: stub.error ?? null,
    count: stub.count ?? 0,
  };

  const chain: Record<string, unknown> = {};
  const methods = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or", "order", "limit", "ilike"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminal awaitables
  chain.then = (cb: (v: typeof result) => unknown) => Promise.resolve(cb(result));
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  return chain;
}

const mockFrom = vi.fn((table: string) => {
  return {
    select: vi.fn(() => makeSelectChain(table)),
    upsert: vi.fn(async (row: Record<string, unknown>, options?: Record<string, unknown>) => {
      const stub = stubs[table] || {};
      if (stub.throwOn === "upsert") {
        throw new Error(`${table} upsert threw`);
      }
      upsertCalls.push({ row, options });
      return { data: null, error: null };
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/data-integrity-audit/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request(
    "http://localhost/api/cron/data-integrity-audit",
  ) as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/data-integrity-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubs = {};
    upsertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("exports nodejs runtime and maxDuration = 120", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("auth short-circuits before any DB access", async () => {
    const unauthResponse = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauthResponse as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(upsertCalls).toHaveLength(0);
  });

  it("upserts a resolved row for every check when no data is returned", async () => {
    // All tables return empty — all checks are clean.
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.issues_found).toBe(0);
    expect(json.failed).toBe(0);
    // One upsert per check
    expect(upsertCalls.length).toBeGreaterThan(0);
    expect(json.checks).toBe(upsertCalls.length);

    // Every clean upsert stamps resolved_at (not null) + issue_count 0
    for (const call of upsertCalls) {
      expect(call.row.issue_count).toBe(0);
      expect(call.row.resolved_at).toEqual(expect.any(String));
      expect(call.options).toEqual({ onConflict: "check_name" });
    }
  });

  it("flags orphan leads when professional_leads references a missing professional", async () => {
    // professional_leads returns 2 rows pointing at professional ids [1, 2].
    // professionals only has id=1 — so id=2 is an orphan.
    stubs["professional_leads"] = {
      rows: [
        { id: 100, professional_id: 1 },
        { id: 200, professional_id: 2 },
      ],
    };
    stubs["professionals"] = { rows: [{ id: 1 }] };

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.issues_found).toBeGreaterThan(0);

    const orphanCheck = upsertCalls.find(
      (c) => c.row.check_name === "professional_leads_orphan_professional",
    );
    expect(orphanCheck).toBeDefined();
    expect(orphanCheck?.row.issue_count).toBe(1);
    expect(orphanCheck?.row.sample_ids).toEqual([200]);
    expect(orphanCheck?.row.severity).toBe("critical");
    expect(orphanCheck?.row.resolved_at).toBeNull();
  });

  it("flags advisors with negative credit balance", async () => {
    stubs["professionals"] = {
      rows: [
        { id: 11, credit_balance_cents: -500 },
        { id: 22, credit_balance_cents: -1 },
      ],
    };

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.issues_found).toBeGreaterThan(0);

    const negBal = upsertCalls.find(
      (c) => c.row.check_name === "advisor_billing_negative_balance",
    );
    expect(negBal?.row.issue_count).toBe(2);
    expect(negBal?.row.severity).toBe("warn");
    expect(negBal?.row.sample_ids).toEqual([11, 22]);
  });

  it("flags disputes approved but with zero refunded_cents", async () => {
    stubs["lead_disputes"] = {
      rows: [{ id: 5, refunded_cents: 0 }],
    };

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.issues_found).toBeGreaterThan(0);

    const approvedZero = upsertCalls.find(
      (c) => c.row.check_name === "disputes_refunded_without_refund_cents",
    );
    expect(approvedZero?.row.issue_count).toBe(1);
    expect(approvedZero?.row.severity).toBe("warn");
    expect(approvedZero?.row.sample_ids).toEqual([5]);
  });

  it("flags form_events with future timestamps via head-count query", async () => {
    stubs["form_events"] = { count: 7 };

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.issues_found).toBeGreaterThan(0);

    const future = upsertCalls.find(
      (c) => c.row.check_name === "form_events_future_timestamps",
    );
    expect(future?.row.issue_count).toBe(7);
    expect(future?.row.severity).toBe("warn");
    // No sample_ids on count-only checks
    expect(future?.row.sample_ids).toBeNull();
  });

  it("flags overdue complaints (critical)", async () => {
    stubs["complaints_register"] = {
      rows: [{ id: 901 }, { id: 902 }, { id: 903 }],
    };

    await GET(makeReq());
    const complaints = upsertCalls.find(
      (c) => c.row.check_name === "complaints_overdue_sla",
    );
    expect(complaints?.row.issue_count).toBe(3);
    expect(complaints?.row.severity).toBe("critical");
  });

  it("flags stuck running jobs in job_queue", async () => {
    stubs["job_queue"] = { rows: [{ id: 1 }] };

    await GET(makeReq());
    const stuck = upsertCalls.find(
      (c) => c.row.check_name === "job_queue_stuck_running",
    );
    expect(stuck?.row.issue_count).toBe(1);
    expect(stuck?.row.severity).toBe("warn");
  });

  it("isolates check failures — one throw doesn't block other checks", async () => {
    // Make the first table throw at select time, all others empty
    stubs["professional_leads"] = { throwOn: "select" };

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.failed).toBe(1);
    // Other checks still ran and upserted clean rows
    expect(upsertCalls.length).toBeGreaterThan(0);
    // The throwing check did NOT upsert a row
    expect(
      upsertCalls.find(
        (c) => c.row.check_name === "professional_leads_orphan_professional",
      ),
    ).toBeUndefined();
  });

  it("returns the same shape every run — idempotent upsert on check_name", async () => {
    const res1 = await GET(makeReq());
    const json1 = await res1.json();
    upsertCalls.length = 0;
    const res2 = await GET(makeReq());
    const json2 = await res2.json();

    expect(json1.checks).toBe(json2.checks);
    expect(json2.ok).toBe(true);
    // Every upsert uses onConflict=check_name → safe to re-run
    for (const call of upsertCalls) {
      expect(call.options).toEqual({ onConflict: "check_name" });
    }
  });
});

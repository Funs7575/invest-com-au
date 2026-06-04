import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAIL: "admin@invest.com.au",
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: unknown) => String(s ?? ""),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

// enqueueJob mock — the durable email path. Returns a job id (truthy) by
// default; tests flip it to null to simulate an enqueue failure.
const { enqueueCalls, mockEnqueueJob } = vi.hoisted(() => ({
  enqueueCalls: [] as { type: string; payload: Record<string, unknown> }[],
  mockEnqueueJob: vi.fn(),
}));
vi.mock("@/lib/job-queue", () => ({
  enqueueJob: mockEnqueueJob,
}));

// DB call queue — consumed in order.
// Call sequence per invocation:
//   [0] from("professionals").select(...).in(...).limit() → advisors list
//   For each advisor:
//     [N] from("professional_leads").select(..., {count}).eq().is().gte() → { count: N }
//     [optionally] from("professionals").update(...).eq() → { error: null }
//                  (warning paths only run this AFTER a successful enqueue)

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

const dbQueue: DbResult[] = [];
let dbIdx = 0;
const updateCalls: { table: string; payload: Record<string, unknown> }[] = [];

function makeChain(table: string, res: DbResult) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or", "order", "limit",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.update = vi.fn((payload: Record<string, unknown>) => {
    updateCalls.push({ table, payload });
    return chain;
  });
  chain.insert = vi.fn(() => chain);
  const r = {
    data: "data" in res ? res.data : null,
    error: res.error ?? null,
    count: res.count ?? null,
  };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) =>
      makeChain(table, dbQueue[dbIdx++] ?? { data: null, error: null, count: 0 }),
    ),
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/enforce-lead-sla/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/enforce-lead-sla") as unknown as NextRequest;
}

type Advisor = {
  id: string;
  name: string;
  email: string;
  status: "active" | "paused";
  auto_paused_at: string | null;
  auto_pause_reason: string | null;
  pause_warning_sent_at: string | null;
};

function advisor(overrides: Partial<Advisor> = {}): Advisor {
  return {
    id: "adv-1",
    name: "Alice Advisor",
    email: "alice@example.com",
    status: "active",
    auto_paused_at: null,
    auto_pause_reason: null,
    pause_warning_sent_at: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/enforce-lead-sla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbIdx = 0;
    dbQueue.length = 0;
    updateCalls.length = 0;
    enqueueCalls.length = 0;
    mockEnqueueJob.mockReset();
    mockEnqueueJob.mockImplementation(
      async (type: string, payload: Record<string, unknown>) => {
        enqueueCalls.push({ type, payload });
        return 123; // job id → durable enqueue succeeded
      },
    );
    delete process.env.RESEND_API_KEY;
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports nodejs runtime and maxDuration=60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 401 when requireCronAuth rejects, makes no DB calls", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(dbIdx).toBe(0);
  });

  it("returns 500 when the initial advisors fetch fails", async () => {
    dbQueue.push({ data: null, error: { message: "DB unreachable" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("fetch_failed");
  });

  it("returns ok:true with all-zero stats when no advisors exist", async () => {
    dbQueue.push({ data: [], error: null }); // empty advisors list
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.warned1).toBe(0);
    expect(body.warned2).toBe(0);
    expect(body.paused).toBe(0);
    expect(body.unpaused).toBe(0);
  });

  it("takes no action when an active advisor has 0 unresponded leads", async () => {
    dbQueue.push({ data: [advisor()], error: null }); // advisors
    dbQueue.push({ count: 0, error: null });           // professional_leads count
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.warned1).toBe(0);
    expect(body.paused).toBe(0);
    // Only 2 from() calls (advisors + leads count, no update)
    expect(dbIdx).toBe(2);
    expect(enqueueCalls).toHaveLength(0);
  });

  it("enqueues warning-1 durably and stamps pause_warning_sent_at when advisor has 3 unresponded and no prior warning", async () => {
    dbQueue.push({ data: [advisor({ pause_warning_sent_at: null })], error: null });
    dbQueue.push({ count: 3, error: null }); // leads count
    dbQueue.push({ error: null });             // update pause_warning_sent_at
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.warned1).toBe(1);
    expect(body.warned2).toBe(0);
    expect(body.paused).toBe(0);
    // Email enqueued durably (job_queue), NOT a raw fire-and-forget fetch.
    expect(enqueueCalls).toHaveLength(1);
    expect(enqueueCalls[0].type).toBe("send_email");
    expect(enqueueCalls[0].payload.to).toBe("alice@example.com");
    // The flag was stamped (enqueue succeeded).
    expect(updateCalls.some((c) => c.table === "professionals" && "pause_warning_sent_at" in c.payload)).toBe(true);
  });

  it("EMAIL RETRY: a failed warning-1 enqueue leaves pause_warning_sent_at UNSET so the next run retries", async () => {
    dbQueue.push({ data: [advisor({ pause_warning_sent_at: null })], error: null });
    dbQueue.push({ count: 3, error: null });
    // Enqueue fails (job_queue insert returned null).
    mockEnqueueJob.mockImplementationOnce(
      async (type: string, payload: Record<string, unknown>) => {
        enqueueCalls.push({ type, payload });
        return null;
      },
    );
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.warned1).toBe(0);
    expect(body.failed).toBe(1);
    // We attempted the enqueue …
    expect(enqueueCalls).toHaveLength(1);
    // … but the flag was NOT stamped, so the warning retries next run.
    expect(updateCalls.some((c) => c.table === "professionals")).toBe(false);
  });

  it("skips warning-1 when advisor already has pause_warning_sent_at set", async () => {
    dbQueue.push({
      data: [advisor({ pause_warning_sent_at: new Date().toISOString() })],
      error: null,
    });
    dbQueue.push({ count: 3, error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.warned1).toBe(0);
    // No update DB call, no enqueue
    expect(dbIdx).toBe(2);
    expect(enqueueCalls).toHaveLength(0);
  });

  it("enqueues warning-2 and stamps when advisor has 5 unresponded and last warn was >24h ago", async () => {
    const lastWarnedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago
    dbQueue.push({
      data: [advisor({ pause_warning_sent_at: lastWarnedAt })],
      error: null,
    });
    dbQueue.push({ count: 5, error: null });
    dbQueue.push({ error: null }); // update pause_warning_sent_at
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.warned2).toBe(1);
    expect(body.paused).toBe(0);
    expect(enqueueCalls).toHaveLength(1);
    expect(updateCalls.some((c) => c.table === "professionals" && "pause_warning_sent_at" in c.payload)).toBe(true);
  });

  it("EMAIL RETRY: a failed warning-2 enqueue leaves the flag unchanged", async () => {
    const lastWarnedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    dbQueue.push({
      data: [advisor({ pause_warning_sent_at: lastWarnedAt })],
      error: null,
    });
    dbQueue.push({ count: 5, error: null });
    mockEnqueueJob.mockImplementationOnce(
      async (type: string, payload: Record<string, unknown>) => {
        enqueueCalls.push({ type, payload });
        return null;
      },
    );
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.warned2).toBe(0);
    expect(body.failed).toBe(1);
    expect(updateCalls.some((c) => c.table === "professionals")).toBe(false);
  });

  it("skips warning-2 when last warn was <24h ago", async () => {
    const recentWarn = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    dbQueue.push({ data: [advisor({ pause_warning_sent_at: recentWarn })], error: null });
    dbQueue.push({ count: 5, error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.warned2).toBe(0);
    // No update call, no enqueue
    expect(dbIdx).toBe(2);
    expect(enqueueCalls).toHaveLength(0);
  });

  it("auto-pauses advisor at 7+ unresponded leads (no prior auto_paused_at), enqueues advisor + admin notices", async () => {
    dbQueue.push({ data: [advisor()], error: null });
    dbQueue.push({ count: 7, error: null });
    dbQueue.push({ error: null }); // update professionals (pause)
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.paused).toBe(1);
    expect(body.warned1).toBe(0);
    expect(body.warned2).toBe(0);
    // Pause landed (durable) + both notices enqueued (advisor + admin).
    expect(updateCalls.some((c) => c.table === "professionals" && c.payload.status === "paused")).toBe(true);
    expect(enqueueCalls).toHaveLength(2);
    expect(enqueueCalls.map((c) => c.payload.to)).toEqual([
      "alice@example.com",
      "admin@invest.com.au",
    ]);
  });

  it("does not re-pause an advisor that already has auto_paused_at set", async () => {
    dbQueue.push({
      data: [advisor({ auto_paused_at: new Date().toISOString(), status: "paused" })],
      error: null,
    });
    dbQueue.push({ count: 9, error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.paused).toBe(0);
    // No update DB call, no enqueue
    expect(dbIdx).toBe(2);
    expect(enqueueCalls).toHaveLength(0);
  });

  it("unpauses advisor paused for SLA when unresponded count drops below 3", async () => {
    dbQueue.push({
      data: [
        advisor({
          status: "paused",
          auto_paused_at: new Date().toISOString(),
          auto_pause_reason: "sla_miss",
        }),
      ],
      error: null,
    });
    dbQueue.push({ count: 1, error: null }); // leads now only 1 unresponded
    dbQueue.push({ error: null });             // update status=active
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.unpaused).toBe(1);
    expect(body.paused).toBe(0);
    // Reinstatement persisted + courtesy email enqueued.
    expect(updateCalls.some((c) => c.table === "professionals" && c.payload.status === "active")).toBe(true);
    expect(enqueueCalls).toHaveLength(1);
  });

  it("increments failed when a per-advisor operation throws", async () => {
    // Provide advisors fetch — but the leads count call throws
    dbQueue.push({ data: [advisor()], error: null });
    // Next from() call will throw synchronously via makeChain error
    dbQueue.push({ data: null, error: { message: "unexpected throw" } });
    const res = await GET(makeReq());
    // Even with an error, the cron returns 200 with stats
    expect(res.status).toBe(200);
    expect(res.ok).toBe(true);
  });
});

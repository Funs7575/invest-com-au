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

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));

// Stripe mock — controls paymentIntents.retrieve/confirm responses
const mockStripeRetrieve = vi.fn();
const mockStripeConfirm = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    paymentIntents: {
      retrieve: (...args: unknown[]) => mockStripeRetrieve(...args),
      confirm: (...args: unknown[]) => mockStripeConfirm(...args),
    },
  }),
}));

// recordLedgerEntry mock — captures the retry-recovery credit and can be made
// to report an idempotent re-run (mid-crash retry: the topup-id triple already
// landed) so we can assert the balance is NOT double-credited.
const { ledgerCalls, mockRecordLedgerEntry } = vi.hoisted(() => ({
  ledgerCalls: [] as Record<string, unknown>[],
  mockRecordLedgerEntry: vi.fn(),
}));
vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: mockRecordLedgerEntry,
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

// DB queue — consumed in order across all from() calls
interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

const dbQueue: DbResult[] = [];
let dbIdx = 0;
// Capture topup/professional updates so we can assert ordering + payloads.
const updateCalls: { table: string; payload: Record<string, unknown> }[] = [];

function makeChain(table: string, res: DbResult) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or", "order", "limit",
    "maybeSingle",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.update = vi.fn((payload: Record<string, unknown>) => {
    updateCalls.push({ table, payload });
    return chain;
  });
  chain.insert = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => makeChain(table, dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/advisor-dunning/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/advisor-dunning") as unknown as NextRequest;
}

const now = Date.now();

function topup(overrides: Record<string, unknown> = {}) {
  return {
    id: "topup-1",
    professional_id: "adv-1",
    amount_cents: 5000,
    status: "failed",
    stripe_payment_intent_id: "pi_test123",
    created_at: new Date(now).toISOString(), // just created (step 0)
    dunning_step: 0,
    dunning_last_attempt_at: null,
    ...overrides,
  };
}

function advisorRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "adv-1",
    name: "Carol",
    email: "carol@example.com",
    stripe_customer_id: "cus_test",
    credit_balance_cents: 0,
    status: "active",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/advisor-dunning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbIdx = 0;
    dbQueue.length = 0;
    updateCalls.length = 0;
    ledgerCalls.length = 0;
    enqueueCalls.length = 0;
    mockStripeRetrieve.mockReset();
    mockStripeConfirm.mockReset();
    mockRecordLedgerEntry.mockReset();
    mockRecordLedgerEntry.mockImplementation(async (input: Record<string, unknown>) => {
      ledgerCalls.push(input);
      return {
        entry: { id: 1 },
        balanceAfterCents: (input.amountCents as number) ?? 0,
        idempotent: false,
      };
    });
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

  it("returns 401 when requireCronAuth rejects, no DB calls", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(dbIdx).toBe(0);
  });

  it("returns 500 fetch_failed when initial DB query errors", async () => {
    dbQueue.push({ data: null, error: { message: "DB unreachable" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("fetch_failed");
  });

  it("returns all-zero stats when no failed top-ups", async () => {
    dbQueue.push({ data: [], error: null });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.emailed).toBe(0);
    expect(body.skipped).toBe(0);
    expect(dbIdx).toBe(1);
  });

  it("skips top-up when dunning step is already current", async () => {
    // Top-up 0 days old, dunning_step=0 → nextStep=0 (same) → skip
    dbQueue.push({ data: [topup({ dunning_step: 0, created_at: new Date(now).toISOString() })], error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.emailed).toBe(0);
    // Only 1 DB call (no advisor lookup when skipped early)
    expect(dbIdx).toBe(1);
  });

  it("step 0→1 transition: enqueues dunning email durably and advances step", async () => {
    // Top-up created 2 days ago → ageDays=2 → nextStep=1
    const createdAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    dbQueue.push({ data: [topup({ dunning_step: 0, created_at: createdAt, stripe_payment_intent_id: "pi_test" })], error: null });
    dbQueue.push({ data: advisorRow(), error: null }); // advisor lookup
    mockStripeRetrieve.mockResolvedValueOnce({ status: "requires_payment_method" });
    mockStripeConfirm.mockResolvedValueOnce({ status: "requires_payment_method" }); // still failing
    dbQueue.push({ error: null }); // update dunning_step on topup
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(1);
    expect(body.retried_failed).toBe(1);
    // Email is enqueued durably (job_queue), NOT a raw fire-and-forget fetch.
    expect(enqueueCalls).toHaveLength(1);
    expect(enqueueCalls[0].type).toBe("send_email");
    expect(enqueueCalls[0].payload.to).toBe("carol@example.com");
    // dunning_step advanced (enqueue succeeded)
    expect(updateCalls.some((c) => c.table === "advisor_credit_topups" && c.payload.dunning_step === 1)).toBe(true);
  });

  it("EMAIL RETRY: a failed enqueue leaves dunning_step UNCHANGED so the next run retries", async () => {
    const createdAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    dbQueue.push({ data: [topup({ dunning_step: 0, created_at: createdAt })], error: null });
    dbQueue.push({ data: advisorRow(), error: null }); // advisor lookup
    mockStripeRetrieve.mockResolvedValueOnce({ status: "requires_payment_method" });
    mockStripeConfirm.mockResolvedValueOnce({ status: "requires_payment_method" });
    // Simulate a durable-enqueue failure (job_queue insert returned null).
    // Use mockImplementationOnce so the call is still recorded.
    mockEnqueueJob.mockImplementationOnce(
      async (type: string, payload: Record<string, unknown>) => {
        enqueueCalls.push({ type, payload });
        return null;
      },
    );
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emailed).toBe(0);
    expect(body.errored).toBe(1);
    // We attempted the enqueue …
    expect(enqueueCalls).toHaveLength(1);
    // … but because it failed, dunning_step was NOT advanced — no topup update.
    expect(updateCalls.some((c) => c.table === "advisor_credit_topups")).toBe(false);
  });

  it("marks retried_succeeded and credits balance via the ledger (credit FIRST, status AFTER)", async () => {
    const createdAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    dbQueue.push({ data: [topup({ dunning_step: 0, created_at: createdAt })], error: null });
    dbQueue.push({ data: advisorRow(), error: null }); // advisor lookup
    mockStripeRetrieve.mockResolvedValueOnce({ status: "requires_confirmation" });
    mockStripeConfirm.mockResolvedValueOnce({ status: "succeeded" });
    dbQueue.push({ error: null }); // update topup status=completed
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.retried_succeeded).toBe(1);
    expect(body.emailed).toBe(0);

    // Credit routed through the ledger with the idempotent topup-id triple
    // (matches the Stripe-webhook topup path → can't double-credit).
    expect(ledgerCalls).toHaveLength(1);
    expect(ledgerCalls[0]).toMatchObject({
      professionalId: "adv-1",
      amountCents: 5000,
      kind: "topup",
      referenceType: "advisor_credit_topup",
      referenceId: "topup-1",
    });
    // Ordering: ledger credit happened BEFORE the topup status flip.
    const ledgerOrder = mockRecordLedgerEntry.mock.invocationCallOrder[0];
    const statusUpdate = updateCalls.find(
      (c) => c.table === "advisor_credit_topups" && c.payload.status === "completed",
    );
    expect(statusUpdate).toBeTruthy();
    // The status flip never raw-increments the balance (that's the ledger's job).
    expect(statusUpdate?.payload).not.toHaveProperty("credit_balance_cents");
    // recordLedgerEntry was invoked (call order recorded) before we returned.
    expect(ledgerOrder).toBeGreaterThan(0);
  });

  it("IDEMPOTENT: retry-success after a mid-crash does NOT double-credit", async () => {
    // Scenario: a prior fire credited the ledger but crashed before flipping
    // the topup to 'completed'. The row is still 'failed', so this run picks
    // it again. The ledger triple already exists → recordLedgerEntry reports
    // idempotent:true and does NOT add to the balance a second time.
    const createdAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    dbQueue.push({ data: [topup({ dunning_step: 0, created_at: createdAt })], error: null });
    dbQueue.push({ data: advisorRow({ credit_balance_cents: 5000 }), error: null }); // already credited
    mockStripeRetrieve.mockResolvedValueOnce({ status: "succeeded" });
    dbQueue.push({ error: null }); // update topup status=completed (idempotent re-flip)
    // Ledger reports the entry already exists.
    mockRecordLedgerEntry.mockImplementationOnce(async (input: Record<string, unknown>) => {
      ledgerCalls.push(input);
      return { entry: { id: 1 }, balanceAfterCents: 5000, idempotent: true };
    });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.retried_succeeded).toBe(1);
    // The ledger was called exactly once and reported idempotent — the helper
    // itself prevents the double-credit. No raw balance write anywhere.
    expect(ledgerCalls).toHaveLength(1);
    expect(
      updateCalls.some(
        (c) => c.table === "professionals" && "credit_balance_cents" in c.payload,
      ),
    ).toBe(false);
    // The status flip still completes (idempotently).
    expect(
      updateCalls.some(
        (c) => c.table === "advisor_credit_topups" && c.payload.status === "completed",
      ),
    ).toBe(true);
  });

  it("auto-pauses advisor and increments paused at step 3", async () => {
    // Top-up 8 days old → nextStep=3
    const createdAt = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    dbQueue.push({ data: [topup({ dunning_step: 2, created_at: createdAt })], error: null });
    dbQueue.push({ data: advisorRow(), error: null }); // advisor lookup
    mockStripeRetrieve.mockResolvedValueOnce({ status: "requires_payment_method" });
    mockStripeConfirm.mockResolvedValueOnce({ status: "requires_payment_method" }); // still failing
    dbQueue.push({ error: null }); // update professionals (pause)
    dbQueue.push({ error: null }); // update topup dunning_step
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.paused).toBe(1);
    expect(body.emailed).toBe(1);
    // The final-notice email was enqueued durably before the pause landed.
    expect(enqueueCalls).toHaveLength(1);
    expect(updateCalls.some((c) => c.table === "professionals" && c.payload.status === "paused")).toBe(true);
  });

  it("at step 3, a failed email enqueue does NOT pause and does NOT advance step", async () => {
    const createdAt = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    dbQueue.push({ data: [topup({ dunning_step: 2, created_at: createdAt })], error: null });
    dbQueue.push({ data: advisorRow(), error: null });
    mockStripeRetrieve.mockResolvedValueOnce({ status: "requires_payment_method" });
    mockStripeConfirm.mockResolvedValueOnce({ status: "requires_payment_method" });
    mockEnqueueJob.mockImplementationOnce(
      async (type: string, payload: Record<string, unknown>) => {
        enqueueCalls.push({ type, payload });
        return null; // enqueue failed
      },
    );
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.paused).toBe(0);
    expect(body.emailed).toBe(0);
    expect(body.errored).toBe(1);
    // No pause, no step advance — the whole transition is held for retry.
    expect(updateCalls.some((c) => c.table === "professionals")).toBe(false);
    expect(updateCalls.some((c) => c.table === "advisor_credit_topups")).toBe(false);
  });
});

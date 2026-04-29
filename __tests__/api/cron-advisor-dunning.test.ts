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

// Fire-and-forget email via fetch
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("ok", { status: 200 }))));

// DB queue — consumed in order across all from() calls
interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "update", "insert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or", "order", "limit",
    "maybeSingle",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
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
    mockStripeRetrieve.mockReset();
    mockStripeConfirm.mockReset();
    vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
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

  it("step 0→1 transition: fetches advisor and sends dunning email", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
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
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("marks retried_succeeded and credits balance when Stripe confirm succeeds", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const createdAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    dbQueue.push({ data: [topup({ dunning_step: 0, created_at: createdAt })], error: null });
    dbQueue.push({ data: advisorRow(), error: null }); // advisor lookup
    mockStripeRetrieve.mockResolvedValueOnce({ status: "requires_confirmation" });
    mockStripeConfirm.mockResolvedValueOnce({ status: "succeeded" });
    dbQueue.push({ error: null }); // update topup status=completed
    dbQueue.push({ error: null }); // update credit_balance_cents
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.retried_succeeded).toBe(1);
    expect(body.emailed).toBe(0);
  });

  it("auto-pauses advisor and increments paused at step 3", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
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
  });
});

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

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

// Two sequential from("professionals") calls per invocation:
//   [0] select advisors with unactioned leads
//   [1] update advisor_nudge_sent_at (per nudged advisor)

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

// fetch mock — controls Resend API responses per call
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }))));

import { GET, runtime, maxDuration } from "@/app/api/cron/advisor-nudge/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/advisor-nudge") as unknown as NextRequest;
}

const TWO_DAYS_AGO = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(); // 49h ago

function advisor(overrides: Record<string, unknown> = {}) {
  return {
    id: "adv-1",
    name: "Bob Advisor",
    email: "bob@example.com",
    advisor_tier: "gold",
    credit_balance_cents: 10000,
    last_lead_date: TWO_DAYS_AGO,
    advisor_nudge_sent_at: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/advisor-nudge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbIdx = 0;
    dbQueue.length = 0;
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "email-1" }), { status: 200 }),
    );
    delete process.env.RESEND_API_KEY;
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports edge runtime and maxDuration=60", () => {
    expect(runtime).toBe("edge");
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

  it("returns skipped when RESEND_API_KEY is not set", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.skipped).toBe(true);
    expect(dbIdx).toBe(0);
  });

  it("returns success with nudged=0 when DB errors", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    dbQueue.push({ data: null, error: { message: "query failed" } });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.nudged).toBe(0);
  });

  it("returns {success:true, nudged:0} when no advisors match", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    dbQueue.push({ data: [], error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.nudged).toBe(0);
    expect(dbIdx).toBe(1);
  });

  it("nudges advisor with unreviewed leads and stamps nudge timestamp", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    dbQueue.push({ data: [advisor()], error: null });
    dbQueue.push({ error: null }); // update advisor_nudge_sent_at
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.nudged).toBe(1);
    expect(body.total).toBe(1);
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    expect(dbIdx).toBe(2);
  });

  it("sends low-balance email when credit_balance_cents < 6000", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    dbQueue.push({ data: [advisor({ credit_balance_cents: 4000 })], error: null });
    dbQueue.push({ error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.nudged).toBe(1);
    // Subject should contain "low" for low-balance path
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const requestBody = JSON.parse(fetchCall?.[1]?.body as string) as { subject: string };
    expect(requestBody.subject).toMatch(/low/i);
  });

  it("does not count nudge when Resend fetch fails", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    dbQueue.push({ data: [advisor()], error: null });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.nudged).toBe(0);
    expect(body.total).toBe(1);
  });
});

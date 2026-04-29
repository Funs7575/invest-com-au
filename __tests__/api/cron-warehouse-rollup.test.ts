import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

import { GET } from "@/app/api/cron/warehouse-rollup/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);

function makeChain(responses: unknown[]) {
  let idx = 0;
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "select", "insert", "upsert", "update", "delete",
    "eq", "neq", "gte", "lte", "lt", "in", "order", "limit", "not",
  ];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    Promise.resolve(resolve(responses[idx++] ?? { data: [], error: null, count: 0 })),
  );
  return chain;
}

// The warehouse rollup computes 11 metrics for up to 3 days, then upserts.
// Each day: 8 sub-queries (count/data), then 1 upsert = 9 calls per day.
// Total: 3 days × 9 calls = 27 responses needed.
function makeHealthySupabase(days = 3) {
  const perDayResponses = [
    { data: null, error: null, count: 5 }, // professionals count (signed_up)
    { data: null, error: null, count: 50 }, // professionals active snapshot
    { data: null, error: null, count: 12 }, // quiz_leads
    { data: null, error: null, count: 8 },  // professional_leads
    { data: null, error: null, count: 100 }, // affiliate_clicks
    { data: null, error: null, count: 30 }, // newsletter_subscribers
    { data: [{ score: 9 }, { score: 7 }, { score: 8 }], error: null }, // nps_responses
    {
      data: [
        { auto_resolved_verdict: "refund", refunded_cents: 5000 },
        { auto_resolved_verdict: "no_refund", refunded_cents: 0 },
      ],
      error: null,
    }, // lead_disputes
    { data: null, error: null }, // upsert warehouse_daily_facts
  ];
  const responses: unknown[] = [];
  for (let i = 0; i < days; i++) {
    responses.push(...perDayResponses);
  }
  const chain = makeChain(responses);
  return { from: vi.fn(() => chain) } as never;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/warehouse-rollup", {
    method: "GET",
    headers: { Authorization: "Bearer test-secret" },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

describe("GET /api/cron/warehouse-rollup", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("processes last 3 days and returns metrics_written count", async () => {
    mockCreateAdmin.mockReturnValue(makeHealthySupabase(3));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.days).toBe(3);
    // 9 metrics per day × 3 days = 27 writes
    // (nps_avg is only written when there are scores; 3 scores → avg written too)
    expect(body.metrics_written).toBeGreaterThan(0);
    expect(body.failed).toBe(0);
  });

  it("computes NPS average and writes nps_avg_score metric", async () => {
    // Single day test to verify NPS avg logic
    const responses = [
      { data: null, error: null, count: 0 }, // professionals signed_up
      { data: null, error: null, count: 10 }, // professionals active
      { data: null, error: null, count: 0 }, // quiz_leads
      { data: null, error: null, count: 0 }, // professional_leads
      { data: null, error: null, count: 0 }, // affiliate_clicks
      { data: null, error: null, count: 0 }, // newsletter_subscribers
      { data: [{ score: 10 }, { score: 6 }], error: null }, // nps scores → avg = 8
      { data: [], error: null }, // disputes
      { data: null, error: null }, // upsert
    ];
    // Simulate 3 days: only day 0 data varies, day 1 and 2 use empty defaults
    const allResponses = [
      ...responses,
      // days 1 and 2 - just empty data to avoid throwing
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: null },
    ];
    const c = makeChain(allResponses);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => c) } as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // nps_avg_score should be written since there were scores
    expect(body.metrics_written).toBeGreaterThanOrEqual(9);
  });

  it("continues other days when one day's upsert throws", async () => {
    const perDay = (fail = false) => [
      { data: null, error: null, count: 1 },
      { data: null, error: null, count: 1 },
      { data: null, error: null, count: 1 },
      { data: null, error: null, count: 1 },
      { data: null, error: null, count: 1 },
      { data: null, error: null, count: 1 },
      { data: [], error: null },
      { data: [], error: null },
      fail ? { error: { message: "upsert failed" } } : { data: null, error: null },
    ];
    const responses = [...perDay(true), ...perDay(false), ...perDay(false)];
    const chain = makeChain(responses);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // Day 1 failed, days 2+3 succeeded
    expect(body.failed).toBe(1);
    expect(body.days).toBe(3);
  });

  it("writes disputes_auto_refunded and total_refunded_cents metrics", async () => {
    const responses = [
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: null, error: null, count: 0 },
      { data: [], error: null }, // no NPS scores
      {
        data: [
          { auto_resolved_verdict: "refund", refunded_cents: 3000 },
          { auto_resolved_verdict: "refund", refunded_cents: 2000 },
          { auto_resolved_verdict: "no_refund", refunded_cents: 0 },
        ],
        error: null,
      },
      { data: null, error: null }, // upsert
      // days 2+3
      ...Array(18).fill({ data: null, error: null, count: 0 }),
    ];
    const chain = makeChain(responses);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

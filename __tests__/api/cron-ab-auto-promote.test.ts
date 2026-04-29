import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

const mockIsFeatureDisabled = vi.fn<(...args: unknown[]) => Promise<boolean>>(() =>
  Promise.resolve(false),
);
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: (...args: unknown[]) => mockIsFeatureDisabled(...args),
}));

const mockDecideWinner = vi.fn();
vi.mock("@/lib/ab-winner", () => ({
  decideWinner: (...args: unknown[]) => mockDecideWinner(...args),
}));

// DB queue
interface DbResult { data?: unknown; error?: { message: string } | null }
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "insert", "eq", "in", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null })),
  })),
}));

import { GET } from "@/app/api/cron/ab-auto-promote/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/ab-auto-promote") as unknown as NextRequest;
}

function makeTest(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, name: "hero-cta", broker_slug: "stake", status: "running",
    impressions_a: 300, impressions_b: 310,
    conversions_a: 30, conversions_b: 45,
    winner: null, min_sample_size: 200, significance_threshold: 0.05,
    auto_promoted: false,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/ab-auto-promote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
    mockIsFeatureDisabled.mockResolvedValue(false);
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("skips with kill_switch_on when ab_tests feature disabled", async () => {
    mockIsFeatureDisabled.mockResolvedValueOnce(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { skipped: string };
    expect(json.skipped).toBe("kill_switch_on");
  });

  it("returns 500 when ab_tests query errors", async () => {
    dbQueue.push({ data: null, error: { message: "db error" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("fetch_failed");
  });

  it("returns ok with scanned=0 when no running tests", async () => {
    dbQueue.push({ data: [] });
    const res = await GET(makeReq());
    const json = await res.json() as { ok: boolean; scanned: number };
    expect(json.ok).toBe(true);
    expect(json.scanned).toBe(0);
  });

  it("skips already-auto-promoted tests", async () => {
    dbQueue.push({ data: [makeTest({ auto_promoted: true })] });
    const res = await GET(makeReq());
    const json = await res.json() as { promoted: number };
    expect(json.promoted).toBe(0);
    expect(mockDecideWinner).not.toHaveBeenCalled();
  });

  it("counts insufficient_sample when sample is too small", async () => {
    dbQueue.push({ data: [makeTest()] });
    mockDecideWinner.mockReturnValueOnce({ winner: null, reason: "insufficient_sample", pValue: 1, zScore: 0, liftPct: 0 });
    const res = await GET(makeReq());
    const json = await res.json() as { insufficient: number };
    expect(json.insufficient).toBe(1);
  });

  it("counts inconclusive when no significant winner", async () => {
    dbQueue.push({ data: [makeTest()] });
    mockDecideWinner.mockReturnValueOnce({ winner: null, reason: "no_significant_difference", pValue: 0.3, zScore: 1, liftPct: 0 });
    const res = await GET(makeReq());
    const json = await res.json() as { inconclusive: number; promoted: number };
    expect(json.inconclusive).toBe(1);
    expect(json.promoted).toBe(0);
  });

  it("promotes winner when decision declares a winner", async () => {
    dbQueue.push({ data: [makeTest()] }); // fetch tests
    dbQueue.push({ data: null }); // update ab_tests
    dbQueue.push({ data: null }); // insert admin_action_log
    mockDecideWinner.mockReturnValueOnce({ winner: "b", reason: "b_wins", pValue: 0.02, zScore: 2.5, liftPct: 25 });
    const res = await GET(makeReq());
    const json = await res.json() as { promoted: number; ok: boolean };
    expect(json.ok).toBe(true);
    expect(json.promoted).toBe(1);
  });

  it("counts failed when update errors", async () => {
    dbQueue.push({ data: [makeTest()] });
    dbQueue.push({ data: null, error: { message: "update failed" } });
    mockDecideWinner.mockReturnValueOnce({ winner: "a", reason: "a_wins", pValue: 0.01, zScore: 3, liftPct: -10 });
    const res = await GET(makeReq());
    const json = await res.json() as { failed: number };
    expect(json.failed).toBe(1);
  });

  it("counts failed when test processing throws", async () => {
    dbQueue.push({ data: [makeTest()] });
    mockDecideWinner.mockImplementationOnce(() => { throw new Error("math error"); });
    const res = await GET(makeReq());
    const json = await res.json() as { failed: number };
    expect(json.failed).toBe(1);
  });
});

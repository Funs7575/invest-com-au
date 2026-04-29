import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/lead-quality-weights/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);

function makeChainWithMaybeSingle(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "update", "insert", "upsert", "gte", "lt", "lte", "not", "is", "order", "limit", "in"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(result)));
  chain["maybeSingle"] = vi.fn(() => ({ then: (resolve: (v: unknown) => void) => Promise.resolve(resolve({ data: null, error: null })) }));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/lead-quality-weights", { method: "GET" });
}

// Generate N fake leads with some converted
function makeLeads(total: number, convertedCount: number, withSignal: string | null = null) {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    quality_signals: withSignal ? { [withSignal]: true } : null,
    converted_at: i < convertedCount ? new Date().toISOString() : null,
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

describe("GET /api/cron/lead-quality-weights", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 on leads fetch error", async () => {
    const chain = makeChainWithMaybeSingle({ data: null, error: { message: "DB error" } });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns insufficient_sample when fewer than 100 leads", async () => {
    const chain = makeChainWithMaybeSingle({ data: makeLeads(50, 5), error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.insufficient_sample).toBe(true);
    expect(body.count).toBe(50);
  });

  it("returns no_signals when all signals have < 20 samples", async () => {
    // 200 leads, none with any signal
    const leads = makeLeads(200, 20);
    let callIdx = 0;
    const chains = [
      makeChainWithMaybeSingle({ data: leads, error: null }),
      makeChainWithMaybeSingle({ data: null, error: null }), // version query
    ];
    const fromFn = vi.fn(() => chains[callIdx++ % 2]!);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.no_signals).toBe(true);
  });

  it("returns 500 when weight insert fails", async () => {
    // 200 leads, 30 with 'has_phone' signal
    const leads = [
      ...makeLeads(30, 10, "has_phone"),  // 30 with has_phone
      ...makeLeads(170, 10),               // 170 without
    ].slice(0, 200);
    let callIdx = 0;
    const insertChain = makeChainWithMaybeSingle({ data: null, error: { message: "insert failed" } });
    const versionChain = { ...makeChainWithMaybeSingle({ data: { model_version: 1 }, error: null }) };
    versionChain.maybeSingle = vi.fn(() => ({
      then: (r: (v: unknown) => void) => Promise.resolve(r({ data: { model_version: 1 }, error: null }))
    }));
    const chains = [
      makeChainWithMaybeSingle({ data: leads, error: null }),
      versionChain,
      insertChain,
    ];
    const fromFn = vi.fn(() => chains[Math.min(callIdx++, chains.length - 1)]!);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns ok with model_version and weight data on success", async () => {
    const leads = [
      ...makeLeads(25, 15, "has_phone"),
      ...makeLeads(175, 30),
    ].slice(0, 200);
    let callIdx = 0;
    const versionChain = makeChainWithMaybeSingle({ data: null, error: null });
    versionChain.maybeSingle = vi.fn(() => ({
      then: (r: (v: unknown) => void) => Promise.resolve(r({ data: { model_version: 3 }, error: null }))
    }));
    const insertChain = makeChainWithMaybeSingle({ data: null, error: null });
    const chains = [
      makeChainWithMaybeSingle({ data: leads, error: null }),
      versionChain,
      insertChain,
    ];
    const fromFn = vi.fn(() => chains[Math.min(callIdx++, chains.length - 1)]!);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.model_version).toBe(4); // next after 3
    expect(body.signals_computed).toBeGreaterThan(0);
    expect(body.total_leads).toBe(200);
    expect(body.weights).toBeDefined();
  });
});

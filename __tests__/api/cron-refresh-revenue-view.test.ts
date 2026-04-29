import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/refresh-revenue-view/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "update", "gte", "lt", "not", "is", "order", "limit", "in"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(result)));
  return chain;
}

const mockFetch = vi.fn();

function makeReq() {
  return new NextRequest("http://localhost/api/cron/refresh-revenue-view", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/cron/refresh-revenue-view", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns success:true when all updates succeed", async () => {
    const chain = makeChain({ data: null, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.errors).toBe(0);
    expect(body.timestamp).toBeDefined();
  });

  it("runs 3 broker priority updates via Promise.allSettled", async () => {
    const chain = makeChain({ data: null, error: null });
    const fromFn = vi.fn(() => chain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    await GET(makeReq());
    // 3 update calls: high, medium, low priority
    expect(fromFn).toHaveBeenCalledTimes(3);
  });

  it("reports error count when an update is rejected", async () => {
    let callCount = 0;
    const chainGood = makeChain({ data: null, error: null });
    const chainBad: Record<string, unknown> = {};
    const methods = ["from", "select", "eq", "update", "gte", "lt", "not", "is", "order", "limit", "in"];
    for (const m of methods) chainBad[m] = vi.fn(() => chainBad);
    chainBad["then"] = vi.fn((_resolve: unknown, reject: (e: Error) => void) => { reject(new Error("update failed")); });

    const fromFn = vi.fn(() => {
      callCount++;
      return callCount === 2 ? chainBad : chainGood;
    });
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.errors).toBe(1);
  });

  it("skips ISR revalidation when REVALIDATE_SECRET is not set", async () => {
    const chain = makeChain({ data: null, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    delete process.env.REVALIDATE_SECRET;

    await GET(makeReq());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("triggers ISR revalidation when REVALIDATE_SECRET is set", async () => {
    const chain = makeChain({ data: null, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    process.env.REVALIDATE_SECRET = "test-secret";

    await GET(makeReq());
    // Should call revalidate for /, /compare, /deals
    expect(mockFetch).toHaveBeenCalledTimes(3);
    delete process.env.REVALIDATE_SECRET;
  });
});

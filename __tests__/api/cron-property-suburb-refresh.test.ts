import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/admin/classifier-config", () => ({ isFeatureDisabled: vi.fn() }));
vi.mock("@/lib/property-suburb-refresh", () => ({ refreshSuburb: vi.fn() }));

import { GET } from "@/app/api/cron/property-suburb-refresh/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { refreshSuburb } from "@/lib/property-suburb-refresh";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockIsFeatureDisabled = vi.mocked(isFeatureDisabled);
const mockRefreshSuburb = vi.mocked(refreshSuburb);

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "order", "limit", "update", "insert", "upsert", "not", "is", "lt", "gte", "in"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(result)));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/property-suburb-refresh", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockIsFeatureDisabled.mockResolvedValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

async function flushTimers(fn: () => Promise<unknown>) {
  const promise = fn();
  await vi.runAllTimersAsync();
  return promise;
}

describe("GET /api/cron/property-suburb-refresh", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok:true with skipped when kill switch is on", async () => {
    mockIsFeatureDisabled.mockResolvedValue(true);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_on");
  });

  it("returns 500 on suburb fetch error", async () => {
    const chain = makeChain({ data: null, error: { message: "DB error" } });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns zero counts when no suburbs in batch", async () => {
    const chain = makeChain({ data: [], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.updated).toBe(0);
  });

  it("increments updated when fields changed", async () => {
    const chain = makeChain({ data: [{ slug: "sydney-2000", state: "NSW", updated_at: null }], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockRefreshSuburb.mockResolvedValue({ fieldsChanged: { median_price: true }, error: null } as never);

    const res = await flushTimers(() => GET(makeReq()));
    const body = await (res as Response).json();
    expect(body.ok).toBe(true);
    expect(body.updated).toBe(1);
    expect(body.unchanged).toBe(0);
  });

  it("increments unchanged when no fields changed", async () => {
    const chain = makeChain({ data: [{ slug: "melb-3000", state: "VIC", updated_at: null }], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockRefreshSuburb.mockResolvedValue({ fieldsChanged: {}, error: null } as never);

    const res = await flushTimers(() => GET(makeReq()));
    const body = await (res as Response).json();
    expect(body.unchanged).toBe(1);
    expect(body.updated).toBe(0);
  });

  it("increments failed when refreshSuburb returns error", async () => {
    const chain = makeChain({ data: [{ slug: "bris-4000", state: "QLD", updated_at: null }], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockRefreshSuburb.mockResolvedValue({ fieldsChanged: {}, error: "provider_unavailable" } as never);

    const res = await flushTimers(() => GET(makeReq()));
    const body = await (res as Response).json();
    expect(body.failed).toBe(1);
    expect(body.updated).toBe(0);
  });

  it("increments failed when refreshSuburb throws", async () => {
    const chain = makeChain({ data: [{ slug: "perth-6000", state: "WA", updated_at: null }], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockRefreshSuburb.mockRejectedValue(new Error("network error"));

    const res = await flushTimers(() => GET(makeReq()));
    const body = await (res as Response).json();
    expect(body.failed).toBe(1);
  });
});

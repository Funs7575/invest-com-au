import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/price-snapshots", () => ({ captureBrokerSnapshotsBatch: vi.fn() }));

import { GET } from "@/app/api/cron/broker-snapshot/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureBrokerSnapshotsBatch } from "@/lib/price-snapshots";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockCapture = vi.mocked(captureBrokerSnapshotsBatch);

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "order", "limit", "insert", "update", "upsert", "delete", "in", "is", "not", "lt", "gte"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/broker-snapshot", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

describe("GET /api/cron/broker-snapshot", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 on broker fetch error", async () => {
    const chain = makeChain({ data: null, error: { message: "DB down" } });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("calls captureBrokerSnapshotsBatch with active brokers", async () => {
    const brokers = [
      { id: "b1", slug: "stake", status: "active", asx_fee: 3, us_fee: 0 },
      { id: "b2", slug: "commsec", status: "active", asx_fee: 10, us_fee: 19.95 },
    ];
    const chain = makeChain({ data: brokers, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockCapture.mockResolvedValue({ total: 2, succeeded: 2, failed: 0 });

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(2);
    expect(body.succeeded).toBe(2);
    expect(body.failed).toBe(0);
    expect(mockCapture).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ slug: "stake" }),
    ]), "cron");
  });

  it("filters out brokers with no slug or id", async () => {
    const brokers = [
      { id: "b1", slug: "stake", status: "active" },
      { id: null, slug: "no-id", status: "active" },
      { id: "b3", slug: "", status: "active" },
    ];
    const chain = makeChain({ data: brokers, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockCapture.mockResolvedValue({ total: 1, succeeded: 1, failed: 0 });

    await GET(makeReq());
    const capturedBrokers = mockCapture.mock.calls[0]![0];
    expect(capturedBrokers).toHaveLength(1);
    expect((capturedBrokers as Array<{ slug: string }>)[0]!.slug).toBe("stake");
  });

  it("returns zero counts when no active brokers exist", async () => {
    const chain = makeChain({ data: [], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockCapture.mockResolvedValue({ total: 0, succeeded: 0, failed: 0 });

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(0);
  });

  it("reports failed count from captureBrokerSnapshotsBatch", async () => {
    const brokers = [{ id: "b1", slug: "stake", status: "active" }];
    const chain = makeChain({ data: brokers, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockCapture.mockResolvedValue({ total: 1, succeeded: 0, failed: 1 });

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.succeeded).toBe(0);
  });
});

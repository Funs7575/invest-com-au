import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/tmds", () => ({ getCurrentTmd: vi.fn() }));

import { GET } from "@/app/api/cron/tmd-audit/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTmd } from "@/lib/tmds";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockGetCurrentTmd = vi.mocked(getCurrentTmd);

type ChainCall = unknown;
type CallQueue = ChainCall[];
const callQueue: CallQueue[] = [];

function makeQueuedChain() {
  let queueIndex = 0;
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "order", "limit", "insert", "update", "upsert", "delete", "in", "is", "not", "lt", "gte"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => unknown) => {
    const result = callQueue[queueIndex++];
    return Promise.resolve(resolve(result));
  });
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/tmd-audit", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  callQueue.length = 0;
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

afterEach(() => {
  callQueue.length = 0;
});

describe("GET /api/cron/tmd-audit", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 on broker fetch error", async () => {
    const chain = makeQueuedChain();
    callQueue.push({ data: null, error: { message: "DB error" } });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns ok with zero missing when all brokers have TMDs", async () => {
    const brokers = [
      { slug: "stake", name: "Stake", status: "active" },
      { slug: "commsec", name: "CommSec", status: "active" },
    ];
    // First call: broker fetch. Subsequent calls: upsert/update (from/chain reuse).
    const chain = makeQueuedChain();
    callQueue.push({ data: brokers, error: null });
    // update call for clearing resolved_at:
    callQueue.push({ data: null, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockGetCurrentTmd.mockResolvedValue({ id: "tmd1" } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checked).toBe(2);
    expect(body.missing_count).toBe(0);
  });

  it("upserts data_integrity_issues when brokers have missing TMDs", async () => {
    const brokers = [
      { slug: "stake", name: "Stake", status: "active" },
      { slug: "bad-broker", name: "Bad Broker", status: "active" },
    ];
    const chain = makeQueuedChain();
    callQueue.push({ data: brokers, error: null });
    // upsert call for data_integrity_issues:
    callQueue.push({ data: null, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    // First broker has TMD, second does not
    mockGetCurrentTmd
      .mockResolvedValueOnce({ id: "tmd1" } as never)
      .mockResolvedValueOnce(null);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.missing_count).toBe(1);
    expect(body.sample).toContain("bad-broker");
  });

  it("reports all missing when no brokers have TMDs", async () => {
    const brokers = [
      { slug: "a", name: "A", status: "active" },
      { slug: "b", name: "B", status: "active" },
      { slug: "c", name: "C", status: "active" },
    ];
    const chain = makeQueuedChain();
    callQueue.push({ data: brokers, error: null });
    callQueue.push({ data: null, error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockGetCurrentTmd.mockResolvedValue(null);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.missing_count).toBe(3);
    expect(body.checked).toBe(3);
  });

  it("upsert failure is non-blocking — returns ok", async () => {
    const brokers = [{ slug: "broke", name: "Broke Broker", status: "active" }];
    const chain = makeQueuedChain();
    // Override then: first call resolves (broker fetch), second call rejects (upsert)
    chain["then"] = vi.fn()
      .mockImplementationOnce((resolve: (v: unknown) => void) => resolve({ data: brokers, error: null }))
      .mockImplementationOnce((_resolve: unknown, reject: (e: Error) => void) => reject(new Error("upsert failed")));
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockGetCurrentTmd.mockResolvedValue(null);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.missing_count).toBe(1);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(async (_name: string, handler: () => Promise<{ response: unknown }>) => {
    const { response } = await handler();
    return response;
  }),
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/advisor-lead-dispute-resolver", () => ({ autoResolveDispute: vi.fn() }));
vi.mock("@/lib/admin/classifier-config", () => ({ isFeatureDisabled: vi.fn() }));

import { GET } from "@/app/api/cron/auto-resolve-disputes/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoResolveDispute } from "@/lib/advisor-lead-dispute-resolver";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockAutoResolve = vi.mocked(autoResolveDispute);
const mockIsFeatureDisabled = vi.mocked(isFeatureDisabled);

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "order", "limit", "insert", "update", "upsert", "delete", "in", "is", "not", "lt", "gte"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)));
  return chain;
}

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/auto-resolve-disputes", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockIsFeatureDisabled.mockResolvedValue(false);
});

describe("GET /api/cron/auto-resolve-disputes", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("short-circuits with skipped when kill switch is on", async () => {
    mockIsFeatureDisabled.mockResolvedValue(true);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_on");
    expect(mockAutoResolve).not.toHaveBeenCalled();
  });

  it("throws when DB fetch fails", async () => {
    const chain = makeChain({ data: null, error: { message: "DB error" } });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    await expect(GET(makeReq())).rejects.toThrow("fetch_failed");
  });

  it("returns all-zero stats when no pending disputes", async () => {
    const chain = makeChain({ data: [], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.refunded).toBe(0);
    expect(body.rejected).toBe(0);
    expect(body.escalated).toBe(0);
    expect(body.failed).toBe(0);
  });

  it("counts refund verdicts", async () => {
    const chain = makeChain({ data: [{ id: "d1" }, { id: "d2" }], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockAutoResolve.mockResolvedValue({ verdict: "refund" } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.scanned).toBe(2);
    expect(body.refunded).toBe(2);
    expect(body.rejected).toBe(0);
  });

  it("counts reject verdicts", async () => {
    const chain = makeChain({ data: [{ id: "d1" }], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockAutoResolve.mockResolvedValue({ verdict: "reject" } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.rejected).toBe(1);
    expect(body.refunded).toBe(0);
    expect(body.escalated).toBe(0);
  });

  it("counts escalated for non-refund/reject verdict", async () => {
    const chain = makeChain({ data: [{ id: "d1" }], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockAutoResolve.mockResolvedValue({ verdict: "escalate" } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.escalated).toBe(1);
  });

  it("increments failed and continues on autoResolveDispute throw", async () => {
    const chain = makeChain({ data: [{ id: "d1" }, { id: "d2" }], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockAutoResolve
      .mockRejectedValueOnce(new Error("classify failed"))
      .mockResolvedValueOnce({ verdict: "refund" } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.refunded).toBe(1);
    expect(body.scanned).toBe(2);
  });
});

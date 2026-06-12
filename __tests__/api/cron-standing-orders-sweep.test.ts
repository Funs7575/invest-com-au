import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockRequireCronAuth } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn<(req: unknown) => unknown>(() => null),
}));
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

// Pass-through run-log wrapper so the test asserts on the handler result.
vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: async (
    _name: string,
    handler: () => Promise<{ response: unknown; stats?: Record<string, unknown> }>,
  ) => (await handler()).response,
}));

const { mockSweep } = vi.hoisted(() => ({
  mockSweep: vi.fn(async () => ({ scanned: 0, accepted: 0 })),
}));
vi.mock("@/lib/briefs/standing-orders", () => ({
  sweepStandingOrders: mockSweep,
}));

import { GET } from "@/app/api/cron/standing-orders-sweep/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/standing-orders-sweep", {
    headers: { authorization: "Bearer test" },
  }) as unknown as NextRequest;
}

describe("/api/cron/standing-orders-sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockSweep.mockResolvedValue({ scanned: 0, accepted: 0 });
  });

  it("rejects unauthenticated callers", async () => {
    mockRequireCronAuth.mockReturnValue(
      NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockSweep).not.toHaveBeenCalled();
  });

  it("runs the sweep and reports stats", async () => {
    mockSweep.mockResolvedValue({ scanned: 12, accepted: 2 });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, scanned: 12, accepted: 2 });
  });
});

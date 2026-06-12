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

vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: async (
    _name: string,
    handler: () => Promise<{ response: unknown; stats?: Record<string, unknown> }>,
  ) => (await handler()).response,
}));

const { mockSweep } = vi.hoisted(() => ({
  mockSweep: vi.fn(async () => ({
    scanned: 0,
    warned: 0,
    clawedBack: 0,
    creditsRefunded: 0,
  })),
}));
vi.mock("@/lib/briefs/sla", () => ({
  sweepBriefSla: mockSweep,
}));

import { GET } from "@/app/api/cron/brief-sla-sweep/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/brief-sla-sweep", {
    headers: { authorization: "Bearer test" },
  }) as unknown as NextRequest;
}

describe("/api/cron/brief-sla-sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
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
    mockSweep.mockResolvedValue({
      scanned: 5,
      warned: 1,
      clawedBack: 2,
      creditsRefunded: 6,
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: true,
      scanned: 5,
      warned: 1,
      clawedBack: 2,
      creditsRefunded: 6,
    });
  });
});

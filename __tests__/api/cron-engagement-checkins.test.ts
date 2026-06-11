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

const { mockRun } = vi.hoisted(() => ({
  mockRun: vi.fn(async () => ({ enabled: false, seeded: 0, due: 0, sent: 0 })),
}));
vi.mock("@/lib/briefs/engagements", () => ({
  runEngagementCheckins: mockRun,
}));

import { GET } from "@/app/api/cron/engagement-checkins/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/engagement-checkins", {
    headers: { authorization: "Bearer test" },
  }) as unknown as NextRequest;
}

describe("/api/cron/engagement-checkins", () => {
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
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("runs and reports stats", async () => {
    mockRun.mockResolvedValue({ enabled: true, seeded: 3, due: 2, sent: 2 });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, enabled: true, seeded: 3, due: 2, sent: 2 });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/attribution-daily", () => ({ rollupYesterdayAttribution: vi.fn() }));

import { GET } from "@/app/api/cron/attribution-rollup/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { rollupYesterdayAttribution } from "@/lib/attribution-daily";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockRollupAttribution = vi.mocked(rollupYesterdayAttribution);

function makeReq() {
  return new NextRequest("http://localhost/api/cron/attribution-rollup", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

describe("GET /api/cron/attribution-rollup", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok:true with rollup result", async () => {
    mockRollupAttribution.mockResolvedValue({
      date: "2026-04-29",
      channelCount: 5,
      totalTouches: 1200,
      totalConversions: 48,
      totalRevenueCents: 960000,
    });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.date).toBe("2026-04-29");
    expect(body.channel_count).toBe(5);
    expect(body.total_touches).toBe(1200);
    expect(body.total_conversions).toBe(48);
    expect(body.total_revenue_cents).toBe(960000);
  });

  it("calls rollupYesterdayAttribution once per request", async () => {
    mockRollupAttribution.mockResolvedValue({
      date: "2026-04-29",
      channelCount: 0,
      totalTouches: 0,
      totalConversions: 0,
      totalRevenueCents: 0,
    });
    await GET(makeReq());
    expect(mockRollupAttribution).toHaveBeenCalledTimes(1);
  });

  it("returns zero counts when no attribution data", async () => {
    mockRollupAttribution.mockResolvedValue({
      date: "2026-04-28",
      channelCount: 0,
      totalTouches: 0,
      totalConversions: 0,
      totalRevenueCents: 0,
    });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.channel_count).toBe(0);
    expect(body.total_revenue_cents).toBe(0);
  });
});

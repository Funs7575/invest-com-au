import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/web-vitals", () => ({ rollupYesterday: vi.fn() }));

import { GET } from "@/app/api/cron/web-vitals-rollup/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { rollupYesterday } from "@/lib/web-vitals";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockRollupYesterday = vi.mocked(rollupYesterday);

function makeReq() {
  return new NextRequest("http://localhost/api/cron/web-vitals-rollup", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

describe("GET /api/cron/web-vitals-rollup", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok:true with rollup result", async () => {
    mockRollupYesterday.mockResolvedValue({ date: "2026-04-29", groups: 12, samples: 840, inserted: 12 });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.date).toBe("2026-04-29");
    expect(body.groups).toBe(12);
    expect(body.samples).toBe(840);
    expect(body.inserted).toBe(12);
  });

  it("calls rollupYesterday once per request", async () => {
    mockRollupYesterday.mockResolvedValue({ date: "2026-04-29", groups: 0, samples: 0, inserted: 0 });
    await GET(makeReq());
    expect(mockRollupYesterday).toHaveBeenCalledTimes(1);
  });

  it("returns zero counts when no samples exist", async () => {
    mockRollupYesterday.mockResolvedValue({ date: "2026-04-28", groups: 0, samples: 0, inserted: 0 });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.groups).toBe(0);
    expect(body.samples).toBe(0);
    expect(body.inserted).toBe(0);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/dated-stats", () => ({
  getStaleStats: vi.fn(() => []),
  getUpcomingStaleStats: vi.fn(() => []),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAIL: "admin@invest.com.au",
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/dated-stats-check/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/dated-stats-check", {
    headers,
  }) as unknown as NextRequest;
}

describe("GET /api/cron/dated-stats-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports nodejs runtime and maxDuration = 30", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(30);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with ok:true when no stale or upcoming stats", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stale).toBe(0);
    expect(body.upcoming).toBe(0);
  });

  it("returns 200 and sends email when there are stale stats", async () => {
    const { getStaleStats, getUpcomingStaleStats } = await import("@/lib/dated-stats");
    const { sendEmail } = await import("@/lib/resend");

    vi.mocked(getStaleStats).mockReturnValue([
      {
        id: "test-stat",
        label: "Test Stat",
        value: "$1B",
        stalesAt: new Date("2024-01-01"),
        page: "/test",
      },
    ]);
    vi.mocked(getUpcomingStaleStats).mockReturnValue([]);

    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stale).toBe(1);
    expect(sendEmail).toHaveBeenCalledOnce();
  });
});

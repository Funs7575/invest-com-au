import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockUpdateResult, mockChain } = vi.hoisted(() => {
  const mockUpdateResult = {
    data: [] as { id: string }[] | null,
    error: null as { message: string } | null,
  };
  const mockChain = {
    update: vi.fn(),
    gt: vi.fn(),
    select: vi.fn(async () => mockUpdateResult),
  };
  mockChain.update.mockReturnValue(mockChain);
  mockChain.gt.mockReturnValue(mockChain);
  return { mockUpdateResult, mockChain };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: vi.fn().mockReturnValue(mockChain) }),
}));

import { GET } from "@/app/api/cron/reset-api-monthly-usage/route";

function makeRequest(auth?: string) {
  return new NextRequest("https://invest.com.au/api/cron/reset-api-monthly-usage", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("GET /api/cron/reset-api-monthly-usage", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    mockUpdateResult.data = [];
    mockUpdateResult.error = null;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthenticated calls", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("resets counters and stamps the period start", async () => {
    mockUpdateResult.data = [{ id: "k1" }, { id: "k2" }];
    const res = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.reset).toBe(2);
    // Reset payload zeroes the monthly counter and stamps a UTC month start.
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ requests_this_month: 0 }),
    );
    expect(new Date(body.periodStart).getUTCDate()).toBe(1);
    // Only keys with usage are touched.
    expect(mockChain.gt).toHaveBeenCalledWith("requests_this_month", 0);
  });

  it("500s when the update fails", async () => {
    mockUpdateResult.data = null;
    mockUpdateResult.error = { message: "boom" };
    const res = await GET(makeRequest("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });
});

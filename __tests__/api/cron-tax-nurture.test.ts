import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(async () => true),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/tax-nurture", () => ({
  runTaxNurture: vi.fn(async () => ({ sent: 0, skipped: 0 })),
}));

// tax-nurture does NOT use cron-run-log so no supabase admin mock needed for the 401/500 path
// but it does import logger at module level — already mocked above.

import { GET } from "@/app/api/cron/tax-nurture/route";

const SECRET = "test-cron-secret-1234567890";
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/tax-nurture", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/tax-nurture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports no specific config (no runtime/maxDuration)", () => {
    // Route has no exports for runtime or maxDuration — just confirm GET exists
    expect(typeof GET).toBe("function");
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

  it("returns 200 on success", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const { isAllowed } = await import("@/lib/rate-limit-db");
    vi.mocked(isAllowed).mockResolvedValueOnce(false);
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(429);
  });
});

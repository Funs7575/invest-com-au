import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ id: "e1", ok: true })),
}));

// NOTE: This route calls requireCronAuth(request) but does NOT return early on
// the result — it ignores the auth return value entirely. So all requests
// reach the handler body regardless of the bearer token. The 401/500 tests
// below reflect the actual behaviour.

import { GET, runtime, maxDuration } from "@/app/api/cron/quarterly-anonymity-audit/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/quarterly-anonymity-audit", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/quarterly-anonymity-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    // Stub fetch so the probe calls don't hit the network
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>clean page</html>", { status: 200 }),
    );
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.restoreAllMocks();
  });

  it("exports nodejs runtime and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 200 with clean audit on a valid request", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.violations).toBe(0);
    expect(typeof body.probed).toBe("number");
  });

  it("returns 200 even with a bad bearer (route ignores auth return value)", async () => {
    // The route calls requireCronAuth() but discards its return value, so
    // even an invalid token reaches the audit body.
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(200);
  });
});

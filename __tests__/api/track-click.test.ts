import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/device-detect", () => ({
  detectDeviceType: vi.fn(() => "desktop"),
}));

import { POST } from "@/app/api/track-click/route";

function makeRequest(
  body: Record<string, unknown> | string,
  ip = "1.2.3.4",
): NextRequest {
  const isString = typeof body === "string";
  return new NextRequest("http://localhost/api/track-click", {
    method: "POST",
    body: isString ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "Mozilla/5.0 Test",
    },
  });
}

describe("POST /api/track-click", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clear rate limit cleanup intervals from the API route modules
    vi.restoreAllMocks();
  });

  it("returns 400 for missing broker_slug", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = makeRequest("not json");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 200 with click_id on valid request", async () => {
    const req = makeRequest({
      broker_slug: "stake",
      broker_name: "Stake",
      source: "compare",
      page: "/compare",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json).toHaveProperty("click_id");
  });

  it("returns 429 when rate limited", async () => {
    const uniqueIp = "10.0.0.1";

    // Send 30 requests (all should succeed)
    for (let i = 0; i < 30; i++) {
      const req = makeRequest({ broker_slug: "stake" }, uniqueIp);
      const res = await POST(req);
      expect(res.status).toBe(200);
    }

    // 31st request should be rate limited
    const req = makeRequest({ broker_slug: "stake" }, uniqueIp);
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("Too many requests");
  });
});

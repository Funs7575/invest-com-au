import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/device-detect", () => ({
  detectDeviceType: vi.fn(() => "desktop"),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => false),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { POST } from "@/app/api/email-capture/route";

function makeRequest(
  body: Record<string, unknown> | string,
  ip = "1.2.3.4"
): NextRequest {
  const isString = typeof body === "string";
  return new NextRequest("http://localhost/api/email-capture", {
    method: "POST",
    body: isString ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

describe("POST /api/email-capture — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for missing email", async () => {
    const req = makeRequest({ source: "test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for empty email", async () => {
    const req = makeRequest({ email: "", source: "test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const req = makeRequest({ email: "not-an-email", source: "test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("email");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = makeRequest("not json");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("accepts valid email and returns success", async () => {
    const req = makeRequest({ email: "user@example.com", source: "test" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("accepts email with name and source fields", async () => {
    const req = makeRequest({
      email: "test@invest.com.au",
      source: "homepage",
      name: "Test User",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

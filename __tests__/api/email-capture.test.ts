import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/email-capture/route";

function makeRequest(
  body: Record<string, unknown>,
  ip = "4.5.6.7",
): NextRequest {
  return new NextRequest("http://localhost/api/email-capture", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "Mozilla/5.0 Test",
    },
  });
}

describe("POST /api/email-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clear rate limit cleanup intervals from the API route modules
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid email", async () => {
    const req = makeRequest({ email: "not-valid-email" }, "40.0.0.1");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for missing email", async () => {
    const req = makeRequest({}, "40.0.0.2");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 200 for valid email capture", async () => {
    const req = makeRequest(
      { email: "user@test.com", source: "homepage" },
      "40.0.0.3",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

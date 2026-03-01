import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/track-event/route";

function makeRequest(
  body: Record<string, unknown>,
  ip = "2.3.4.5",
): NextRequest {
  return new NextRequest("http://localhost/api/track-event", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "Mozilla/5.0 Test",
    },
  });
}

describe("POST /api/track-event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clear rate limit cleanup intervals from the API route modules
    vi.restoreAllMocks();
  });

  it("returns 400 for missing event_type", async () => {
    const req = makeRequest({}, "20.0.0.1");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for disallowed event_type", async () => {
    const req = makeRequest({ event_type: "hack_attempt" }, "20.0.0.2");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 200 for valid quiz_start event", async () => {
    const req = makeRequest(
      { event_type: "quiz_start", page: "/quiz" },
      "20.0.0.3",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 200 for valid calculator_use event", async () => {
    const req = makeRequest(
      { event_type: "calculator_use", page: "/calculator" },
      "20.0.0.4",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

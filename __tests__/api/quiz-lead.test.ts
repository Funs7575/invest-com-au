import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/quiz-lead/route";

function makeRequest(
  body: Record<string, unknown>,
  ip = "3.4.5.6",
): NextRequest {
  return new NextRequest("http://localhost/api/quiz-lead", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "Mozilla/5.0 Test",
    },
  });
}

describe("POST /api/quiz-lead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clear rate limit cleanup intervals from the API route modules
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid email", async () => {
    const req = makeRequest({ email: "not-an-email" }, "30.0.0.1");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for missing email", async () => {
    const req = makeRequest({}, "30.0.0.2");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 200 for valid quiz lead submission", async () => {
    const req = makeRequest(
      {
        email: "test@example.com",
        name: "Test User",
        answers: ["grow", "beginner", "small"],
        top_match_slug: "stake",
      },
      "30.0.0.3",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

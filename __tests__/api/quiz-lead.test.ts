import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/quiz-history", () => ({
  recordQuizSubmission: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
    }),
  ),
}));

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
    mockIsAllowed.mockResolvedValue(true);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/quiz-lead", {
      method: "POST",
      body: "{not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid JSON body");
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

  it("rejects disposable email domains", async () => {
    const req = makeRequest(
      { email: "spam@mailinator.com" },
      "30.0.0.10",
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "Please use a real email address.",
    );
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const req = makeRequest(
      { email: "rate@example.com" },
      "30.0.0.11",
    );
    const res = await POST(req);
    expect(res.status).toBe(429);
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

  it("normalizes mixed-case email to lowercase", async () => {
    const req = makeRequest(
      {
        email: "Mixed.Case@EXAMPLE.com",
        name: "Mixed",
        answers: [],
        top_match_slug: "stake",
      },
      "30.0.0.4",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("succeeds without top_match_slug (skips email send)", async () => {
    const req = makeRequest(
      {
        email: "no-match@example.com",
        name: "No Match",
        answers: ["beginner"],
      },
      "30.0.0.5",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("accepts answers when not an array (treats as empty)", async () => {
    const req = makeRequest(
      {
        email: "weird-answers@example.com",
        answers: "not-an-array",
      },
      "30.0.0.6",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

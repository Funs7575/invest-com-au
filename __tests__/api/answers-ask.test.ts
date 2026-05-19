import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => mockIsRateLimited(),
}));

const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

import { POST } from "@/app/api/answers/ask/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/answers/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeInsertChain(result: { error: null | { message: string } }) {
  const chain = { insert: vi.fn(() => Promise.resolve(result)) };
  mockServerFrom.mockReturnValue(chain);
  return chain;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/answers/ask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeRequest({ question: "What is a good ETF to invest in?" }));
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/answers/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when question is too short", async () => {
    makeInsertChain({ error: null });
    const res = await POST(makeRequest({ question: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is malformed", async () => {
    makeInsertChain({ error: null });
    const res = await POST(makeRequest({ question: "What is the best super fund for my situation?", email: "notanemail" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when category is not in enum", async () => {
    makeInsertChain({ error: null });
    const res = await POST(makeRequest({ question: "What is the best super fund for my situation?", category: "invalid_cat" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with slug for valid submission", async () => {
    makeInsertChain({ error: null });
    const res = await POST(makeRequest({ question: "How do I compare ETFs for long-term investing?", category: "managed_funds" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { slug: string; status: string };
    expect(body.slug).toMatch(/^qqq/);
    expect(body.status).toBe("pending");
  });

  it("returns 200 with optional email accepted", async () => {
    makeInsertChain({ error: null });
    const res = await POST(makeRequest({
      question: "How do I open a brokerage account in Australia?",
      email: "user@example.com",
    }));
    expect(res.status).toBe(200);
  });

  it("returns 500 when supabase insert fails", async () => {
    makeInsertChain({ error: { message: "db error" } });
    const res = await POST(makeRequest({ question: "What is negative gearing and how does it work?" }));
    expect(res.status).toBe(500);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ from: mockServerFrom })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { POST } from "@/app/api/questions/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  broker_slug: "commsec",
  page_type: "broker",
  page_slug: "commsec",
  question: "What are the brokerage fees for ASX trades?",
  display_name: "Curious Investor",
  email: "user@example.com",
};

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeInsertChain(error: unknown = null) {
  return {
    insert: vi.fn().mockResolvedValue({ error }),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockServerFrom.mockReturnValue(makeInsertChain());
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockServerFrom).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/questions", {
      method: "POST",
      headers: { "x-forwarded-for": "1.2.3.4" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when required field broker_slug is missing", async () => {
    const { broker_slug: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing required/i);
  });

  it("returns 400 when question is too short (< 10 chars)", async () => {
    const res = await POST(makePost({ ...VALID_BODY, question: "Short?" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/10/);
  });

  it("returns 400 when question exceeds 500 characters", async () => {
    const res = await POST(makePost({ ...VALID_BODY, question: "A".repeat(501) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/500/);
  });

  it("returns 400 when display_name is too short (< 2 chars)", async () => {
    const res = await POST(makePost({ ...VALID_BODY, display_name: "X" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/2/);
  });

  it("returns 500 when DB insert fails", async () => {
    mockServerFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: "db error" } }),
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 200 success with trimmed question", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockServerFrom.mockReturnValue({ insert: insertMock });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" })
    );
  });
});

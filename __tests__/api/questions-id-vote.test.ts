import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const mockIsRateLimited = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/questions/[id]/vote/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const QUESTION = { id: 42, vote_count: 5 };

function makePost(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/questions/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeSelectChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn().mockResolvedValue({ data, error });
  return c;
}

function makeInsertUpdateChain(error: unknown = null) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn().mockResolvedValue({ error });
  c.update = vi.fn(() => c);
  c.eq = vi.fn().mockResolvedValue({ error });
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/questions/[id]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    // Default: question found, no existing vote, insert+update ok
    let fromCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_questions") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        if (fromCallCount++ < 2) {
          c.single = vi.fn().mockResolvedValue({ data: QUESTION, error: null });
        } else {
          c.single = vi.fn().mockResolvedValue({ data: null, error: null });
        }
        c.update = vi.fn(() => c);
        // For the count update:
        let eqIdx = 0;
        c.eq = vi.fn(() => {
          eqIdx++;
          // Return thenable for the final update eq
          if (eqIdx > 1) return Promise.resolve({ error: null });
          return c;
        });
        return c;
      }
      if (table === "qa_votes") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({ data: null, error: null });
        c.insert = vi.fn().mockResolvedValue({ error: null });
        c.update = vi.fn(() => c);
        return c;
      }
      return makeInsertUpdateChain();
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost("42", { vote: 1 }), makeParams("42"));
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric question ID", async () => {
    const res = await POST(makePost("abc", { vote: 1 }), makeParams("abc"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid question id/i);
  });

  it("returns 400 when vote is not 1 or -1", async () => {
    const res = await POST(makePost("42", { vote: 2 }), makeParams("42"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/1 or -1/i);
  });

  it("returns 404 when question is not found or not approved", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_questions") return makeSelectChain(null, { message: "not found" });
      return makeSelectChain(null);
    });
    const res = await POST(makePost("99", { vote: 1 }), makeParams("99"));
    expect(res.status).toBe(404);
  });

  it("returns vote_count unchanged when same vote already cast", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_questions") return makeSelectChain(QUESTION);
      if (table === "qa_votes") return makeSelectChain({ id: 10, vote_value: 1 });
      return makeInsertUpdateChain();
    });
    const res = await POST(makePost("42", { vote: 1 }), makeParams("42"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vote_count).toBe(QUESTION.vote_count);
  });

  it("returns 500 when qa_votes insert fails on new vote", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_questions") {
        const c = makeSelectChain(QUESTION);
        (c as Record<string, unknown>).update = vi.fn(() => c);
        return c;
      }
      if (table === "qa_votes") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({ data: null, error: null });
        c.insert = vi.fn().mockResolvedValue({ error: { message: "constraint" } });
        return c;
      }
      return makeInsertUpdateChain();
    });
    const res = await POST(makePost("42", { vote: 1 }), makeParams("42"));
    expect(res.status).toBe(500);
  });

  it("uses IP-based rate limit key", async () => {
    await POST(makePost("42", { vote: 1 }), makeParams("42"));
    expect(mockIsRateLimited).toHaveBeenCalledWith(
      expect.stringContaining("1.2.3.4"),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

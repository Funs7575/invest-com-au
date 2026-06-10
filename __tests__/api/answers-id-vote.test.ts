import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/answers/[id]/vote/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(id: string, body: unknown, ip = "1.2.3.4"): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/answers/${id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ id }) }];
}

function mockChain(result: { data: unknown; error?: { message: string } | null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "update", "insert", "not"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(resolve(result));
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/answers/[id]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, ctx] = makeReq("1", { vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 when id is not a number", async () => {
    const [req, ctx] = makeReq("abc", { vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/invalid answer id/i);
  });

  it("returns 400 when vote is not 1 or -1", async () => {
    const [req, ctx] = makeReq("5", { vote: 2 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/vote must be 1 or -1/i);
  });

  it("returns 404 when answer not found", async () => {
    mockAdminFrom.mockReturnValue(mockChain({ data: null, error: { message: "Not found" } }));
    const [req, ctx] = makeReq("99", { vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns current counts unchanged when same vote already cast", async () => {
    const answer = { id: 1, vote_count: 5, helpful_count: 3 };
    const existingVote = { id: 10, vote_value: 1 };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: answer });
      return mockChain({ data: existingVote });
    });
    const [req, ctx] = makeReq("1", { vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { vote_count: number; helpful_count: number };
    expect(body.vote_count).toBe(5);
    expect(body.helpful_count).toBe(3);
  });

  it("inserts new vote and returns updated counts", async () => {
    const answer = { id: 2, vote_count: 4, helpful_count: 2 };
    let callCount = 0;
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: answer });
      if (callCount === 2) return mockChain({ data: null }); // no existing vote
      if (callCount === 3) return insertChain;
      return updateChain;
    });
    const [req, ctx] = makeReq("2", { vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { vote_count: number; helpful_count: number };
    expect(body.vote_count).toBe(5); // 4 + 1
    expect(body.helpful_count).toBe(3); // 2 + 1
  });

  it("changes vote direction and adjusts helpful_count", async () => {
    const answer = { id: 3, vote_count: 2, helpful_count: 1 };
    const existingVote = { id: 20, vote_value: 1 }; // previously upvoted
    let callCount = 0;
    const updateVoteChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const updateCountChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: answer });
      if (callCount === 2) return mockChain({ data: existingVote });
      if (callCount === 3) return updateVoteChain;
      return updateCountChain;
    });
    const [req, ctx] = makeReq("3", { vote: -1 }); // flipping to downvote
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { vote_count: number; helpful_count: number };
    // voteDelta = -1 - 1 = -2; helpfulDelta = -1 (losing upvote)
    expect(body.vote_count).toBe(0); // 2 + (-2)
    expect(body.helpful_count).toBe(0); // max(0, 1 + (-1))
  });

  it("returns 500 when vote count update fails", async () => {
    const answer = { id: 4, vote_count: 0, helpful_count: 0 };
    let callCount = 0;
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const failUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
    };
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockChain({ data: answer });
      if (callCount === 2) return mockChain({ data: null });
      if (callCount === 3) return insertChain;
      return failUpdateChain;
    });
    const [req, ctx] = makeReq("4", { vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
  });
});

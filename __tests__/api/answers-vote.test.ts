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

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/answers/[id]/vote/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ANSWER_ID = "42";

function makeRequest(body: unknown, ip = "10.0.0.1") {
  return new NextRequest(`http://localhost/api/answers/${ANSWER_ID}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function makeParams(id = ANSWER_ID) {
  return { params: Promise.resolve({ id }) };
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "update", "insert"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const BASE_ANSWER = { id: 42, vote_count: 5, helpful_count: 3 };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/answers/[id]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeRequest({ vote: 1 }), makeParams());
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric answer ID", async () => {
    const res = await POST(makeRequest({ vote: 1 }), makeParams("not-a-number"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid answer id/i);
  });

  it("returns 400 when vote is not 1 or -1", async () => {
    const res = await POST(makeRequest({ vote: 0 }), makeParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/vote must be 1 or -1/i);
  });

  it("returns 404 when answer not found or not approved", async () => {
    const chain = makeChain({ data: null, error: { message: "not found" } });
    mockAdminFrom.mockReturnValue(chain);

    const res = await POST(makeRequest({ vote: 1 }), makeParams());
    expect(res.status).toBe(404);
  });

  it("records a new upvote and returns updated counts", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: BASE_ANSWER, error: null }); // answer lookup
      if (call === 2) return makeChain({ data: null, error: null });        // no existing vote
      if (call === 3) return makeChain({ data: null, error: null });        // insert vote
      return makeChain({ data: null, error: null });                        // update counts
    });

    const res = await POST(makeRequest({ vote: 1 }), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vote_count).toBe(6); // 5 + 1
    expect(body.helpful_count).toBe(4); // 3 + 1 (upvote adds to helpful)
  });

  it("records a new downvote without changing helpful_count", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: BASE_ANSWER, error: null });
      if (call === 2) return makeChain({ data: null, error: null }); // no existing vote
      if (call === 3) return makeChain({ data: null, error: null }); // insert
      return makeChain({ data: null, error: null });                  // update
    });

    const res = await POST(makeRequest({ vote: -1 }), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vote_count).toBe(4); // 5 + (-1)
    expect(body.helpful_count).toBe(3); // unchanged (downvote adds helpfulDelta=0)
  });

  it("returns existing counts without change when same vote is cast again", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: BASE_ANSWER, error: null });
      // existing vote same as new vote
      if (call === 2) return makeChain({ data: { id: 99, vote_value: 1 }, error: null });
      return makeChain({ data: null, error: null });
    });

    const res = await POST(makeRequest({ vote: 1 }), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vote_count).toBe(5); // unchanged
    expect(body.helpful_count).toBe(3); // unchanged
  });

  it("changes vote direction from downvote to upvote", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: BASE_ANSWER, error: null });
      if (call === 2) return makeChain({ data: { id: 99, vote_value: -1 }, error: null }); // was -1
      if (call === 3) return makeChain({ data: null, error: null }); // update vote
      return makeChain({ data: null, error: null });                  // update counts
    });

    const res = await POST(makeRequest({ vote: 1 }), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    // voteDelta = 1 - (-1) = 2, helpfulDelta = +1 (gaining upvote)
    expect(body.vote_count).toBe(7); // 5 + 2
    expect(body.helpful_count).toBe(4); // 3 + 1
  });

  it("returns 500 when vote update fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: BASE_ANSWER, error: null });
      if (call === 2) return makeChain({ data: { id: 99, vote_value: -1 }, error: null });
      // update vote fails
      const c = makeChain({ data: null, error: { message: "update failed" } });
      return c;
    });

    const res = await POST(makeRequest({ vote: 1 }), makeParams());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to update vote/i);
  });

  it("returns 500 when vote insert fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: BASE_ANSWER, error: null });
      if (call === 2) return makeChain({ data: null, error: null }); // no existing vote
      // insert fails
      const c = makeChain({ data: null, error: { message: "insert failed" } });
      return c;
    });

    const res = await POST(makeRequest({ vote: 1 }), makeParams());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to record vote/i);
  });

  it("returns 400 on malformed JSON body", async () => {
    const req = new NextRequest(`http://localhost/api/answers/${ANSWER_ID}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req, makeParams());
    expect(res.status).toBe(400);
  });

  it("helpful_count is floored at 0 (never goes negative)", async () => {
    const lowHelpful = { ...BASE_ANSWER, helpful_count: 0 };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: lowHelpful, error: null });
      if (call === 2) return makeChain({ data: { id: 99, vote_value: 1 }, error: null }); // was upvote
      if (call === 3) return makeChain({ data: null, error: null }); // update vote
      return makeChain({ data: null, error: null });
    });

    const res = await POST(makeRequest({ vote: -1 }), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.helpful_count).toBe(0); // Math.max(0, 0 - 1) = 0
  });
});

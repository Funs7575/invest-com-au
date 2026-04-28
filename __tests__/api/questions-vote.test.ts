import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { POST } from "@/app/api/questions/[id]/vote/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, id = "42", ip = "1.2.3.4"): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest("http://localhost/api/questions/42/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ id }) }];
}

/** A thenable chain — every method returns the same object; await resolves to `result`. */
function makeChain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "single", "update", "insert"]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn().mockResolvedValue(result);
  b.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return b;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/questions/[id]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, ctx] = makePost({ vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric question id", async () => {
    const [req, ctx] = makePost({ vote: 1 }, "abc");
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid question id/i);
  });

  it("returns 400 when vote value is not 1 or -1", async () => {
    const [req, ctx] = makePost({ vote: 0 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/vote must be 1 or -1/i);
  });

  it("returns 404 when question not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const [req, ctx] = makePost({ vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns unchanged vote_count when same vote already cast", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: { id: 42, vote_count: 5 }, error: null }))
      .mockImplementationOnce(() => makeChain({ data: { id: 99, vote_value: 1 }, error: null }));
    const [req, ctx] = makePost({ vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vote_count).toBe(5);
  });

  it("inserts new vote and updates count on first vote", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: { id: 42, vote_count: 5 }, error: null }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }))
      .mockImplementationOnce(() => makeChain({ error: null }))
      .mockImplementationOnce(() => makeChain({ error: null }));
    const [req, ctx] = makePost({ vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vote_count).toBe(6);
  });

  it("returns 500 when vote insert fails", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: { id: 42, vote_count: 5 }, error: null }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }))
      .mockImplementationOnce(() => makeChain({ error: { message: "insert error" } }));
    const [req, ctx] = makePost({ vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
  });

  it("applies delta +2 when changing vote from -1 to +1", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: { id: 42, vote_count: 3 }, error: null }))
      .mockImplementationOnce(() => makeChain({ data: { id: 99, vote_value: -1 }, error: null }))
      .mockImplementationOnce(() => makeChain({ error: null }))
      .mockImplementationOnce(() => makeChain({ error: null }));
    const [req, ctx] = makePost({ vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    // delta = 1 - (-1) = +2 → vote_count = 3 + 2 = 5
    const json = await res.json();
    expect(json.vote_count).toBe(5);
  });

  it("returns 500 when vote count update fails", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: { id: 42, vote_count: 5 }, error: null }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }))
      .mockImplementationOnce(() => makeChain({ error: null }))
      .mockImplementationOnce(() => makeChain({ error: { message: "count update error" } }));
    const [req, ctx] = makePost({ vote: 1 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
  });
});

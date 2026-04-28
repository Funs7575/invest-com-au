import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// createRateLimiter is called at module-init time; returning a controlled fn
// via this mock means the module-level `isRateLimited` uses our spy.
const rateLimitFn = vi.hoisted(() => vi.fn<() => boolean>(() => false));

vi.mock("@/lib/rate-limiter", () => ({
  createRateLimiter: () => rateLimitFn,
}));

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: rpcMock,
    from: fromMock,
  })),
}));

import { POST } from "@/app/api/ab-track/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ab-track", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "5.6.7.8" },
  });
}

/** Chainable Supabase query builder that resolves to `result` when awaited. */
function makeChain(result: unknown): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "update", "single"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve();
  };
  return b;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/ab-track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitFn.mockReturnValue(false);
    rpcMock.mockResolvedValue({ error: null });
  });

  it("returns 429 when rate-limited", async () => {
    rateLimitFn.mockReturnValueOnce(true);
    const res = await POST(makeReq({ test_id: 1, variant: "a", event_type: "impression" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/ab-track", {
      method: "POST",
      body: "bad json{{",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when test_id is missing", async () => {
    const res = await POST(makeReq({ variant: "a", event_type: "impression" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/test_id/i);
  });

  it("returns 400 when test_id is not a number", async () => {
    const res = await POST(makeReq({ test_id: "one", variant: "a", event_type: "impression" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when variant is not 'a' or 'b'", async () => {
    const res = await POST(makeReq({ test_id: 1, variant: "c", event_type: "impression" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/variant/i);
  });

  it("returns 400 when event_type is not 'impression' or 'click'", async () => {
    const res = await POST(makeReq({ test_id: 1, variant: "a", event_type: "view" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/event_type/i);
  });

  it("returns 200 when RPC succeeds (impression + variant a)", async () => {
    rpcMock.mockResolvedValueOnce({ error: null });
    const res = await POST(makeReq({ test_id: 5, variant: "a", event_type: "impression" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith(
      "increment_ab_counter",
      { p_test_id: 5, p_column: "impressions_a" },
    );
  });

  it("returns 200 when RPC succeeds (click + variant b)", async () => {
    rpcMock.mockResolvedValueOnce({ error: null });
    const res = await POST(makeReq({ test_id: 7, variant: "b", event_type: "click" }));
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith(
      "increment_ab_counter",
      { p_test_id: 7, p_column: "clicks_b" },
    );
  });

  it("falls back to read-then-write when RPC fails and test exists — returns 200", async () => {
    rpcMock.mockResolvedValueOnce({ error: { message: "function not found" } });
    const testRow = { id: 3, impressions_a: 2, impressions_b: 0, clicks_a: 0, clicks_b: 0 };
    const selectChain = makeChain({ data: testRow, error: null });
    // Wrap the chain to provide .eq().eq().single() resolution
    (selectChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: testRow, error: null });
    const updateChain = makeChain({ data: null, error: null });

    fromMock.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const res = await POST(makeReq({ test_id: 3, variant: "a", event_type: "impression" }));
    expect(res.status).toBe(200);
  });

  it("falls back and returns 404 when test is not found after RPC failure", async () => {
    rpcMock.mockResolvedValueOnce({ error: { message: "no such function" } });
    const selectChain = makeChain({ data: null, error: null });
    (selectChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });

    fromMock.mockReturnValueOnce(selectChain);

    const res = await POST(makeReq({ test_id: 99, variant: "b", event_type: "click" }));
    expect(res.status).toBe(404);
  });

  it("falls back and returns 500 when update fails after RPC failure", async () => {
    rpcMock.mockResolvedValueOnce({ error: { message: "rpc error" } });
    const testRow = { id: 2, impressions_a: 0, impressions_b: 0, clicks_a: 0, clicks_b: 0 };
    const selectChain = makeChain({ data: testRow, error: null });
    (selectChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: testRow, error: null });
    const updateChain = makeChain({ data: null, error: { message: "write failed" } });

    fromMock.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const res = await POST(makeReq({ test_id: 2, variant: "a", event_type: "click" }));
    expect(res.status).toBe(500);
  });
});

/**
 * Tests for POST /api/outcomes/submit
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockSubmitOutcome, mockSettleSuccessCharge, mockAdminFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockSubmitOutcome: vi.fn(async () => ({
    brief_id: "brief-1",
    outcome: "completed",
    professional_id: 42,
  })),
  mockSettleSuccessCharge: vi.fn(async () => ({ charged: false })),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/outcomes", () => ({
  submitOutcome: mockSubmitOutcome,
}));

vi.mock("@/lib/briefs/pricing-tier", () => ({
  settleSuccessCharge: mockSettleSuccessCharge,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/outcomes/submit/route";

const VALID_BODY = {
  token: "tok_1234567890123456",
  outcome: "completed",
};

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/outcomes/submit", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

describe("POST /api/outcomes/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockSubmitOutcome.mockResolvedValue({
      brief_id: "brief-1",
      outcome: "completed",
      professional_id: 42,
    });
    mockSettleSuccessCharge.mockResolvedValue({ charged: false });
    // maybeSingle for brief lookup
    const chain: Record<string, unknown> = {};
    for (const m of ["select","eq","maybeSingle","in"]) chain[m] = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () => ({ data: { accept_credits_cost: 2 }, error: null }));
    mockAdminFrom.mockReturnValue(chain);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing token", async () => {
    const res = await POST(makeReq({ outcome: "completed" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for token too short", async () => {
    const res = await POST(makeReq({ token: "short", outcome: "completed" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid outcome value", async () => {
    const res = await POST(makeReq({ token: "tok_1234567890123456", outcome: "bad_outcome" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/outcomes/submit", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when token is invalid/expired", async () => {
    mockSubmitOutcome.mockResolvedValue(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 200 on success", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 200 and attempts settle on completed outcome", async () => {
    mockSettleSuccessCharge.mockResolvedValue({ charged: true, amountCents: 500 });
    const res = await POST(makeReq({ ...VALID_BODY, outcome: "completed" }));
    expect(res.status).toBe(200);
  });

  it("returns 200 for non-completed outcomes (no settle attempted)", async () => {
    mockSubmitOutcome.mockResolvedValue({
      brief_id: "brief-1",
      outcome: "abandoned",
      professional_id: 42,
    });
    const res = await POST(makeReq({ ...VALID_BODY, outcome: "abandoned" }));
    expect(res.status).toBe(200);
    // settle should not be called for abandoned
    expect(mockSettleSuccessCharge).not.toHaveBeenCalled();
  });
});

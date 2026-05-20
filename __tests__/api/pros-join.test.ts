/**
 * Tests for POST /api/pros/join
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockSendWelcomePro } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockSendWelcomePro: vi.fn(async () => true),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/pro-onboarding-emails", () => ({
  sendWelcomePro: mockSendWelcomePro,
}));

vi.mock("@/lib/pro-onboarding", () => ({
  STARTER_FREE_CREDITS: 10,
}));

// Default supabase admin mock: no existing pro, insert succeeds
const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/pros/join/route";

const VALID_BODY = {
  kind: "individual",
  specialties: ["financial_planner"],
  name: "Jane Smith",
  email: "jane@example.com",
  verification_doc_path: "pending/12345-abcdef.pdf",
  payout_bsb: "062-001",
  payout_account_last4: "1234",
  agreed_to_terms: true,
};

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/join", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  });
}

function setupDefaultMocks() {
  // First call: email dedupe check -> no existing
  // Second call: slug clash check -> no clash
  // Third call: insert -> success
  let callCount = 0;
  mockAdminFrom.mockImplementation(() => {
    callCount++;
    const chain: Record<string, unknown> = {};
    for (const m of ["select","insert","update","eq","in","maybySingle","filter"]) {
      chain[m] = vi.fn(() => chain);
    }

    if (callCount === 3) {
      // insert call
      chain.insert = vi.fn(() => chain);
      chain.select = vi.fn(() => chain);
      chain.single = vi.fn(async () => ({ data: { id: 1, slug: "jane-smith" }, error: null }));
    } else {
      chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    }
    return chain;
  });
}

describe("POST /api/pros/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockSendWelcomePro.mockResolvedValue(true);
    setupDefaultMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing name", async () => {
    const { name: _name, ...body } = VALID_BODY;
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing agreed_to_terms", async () => {
    const { agreed_to_terms: _agreed, ...body } = VALID_BODY;
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty specialties", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, specialties: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid BSB", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, payout_bsb: "12345" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid account last4", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, payout_account_last4: "12" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already has application", async () => {
    mockAdminFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select","insert","eq","in","filter"]) chain[m] = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => ({ data: { id: 1, verification_status: "pending" }, error: null }));
      return chain;
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(409);
  });
});

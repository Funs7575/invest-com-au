/**
 * Tests for POST /api/pros/billing/auto-recharge
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockGetPack } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
  mockGetPack: vi.fn(() => ({ slug: "marketplace_5", isCredit: true, credits: 5 })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/advisor-credit-packs", () => ({
  getPack: mockGetPack,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/pros/billing/auto-recharge/route";

const VALID_BODY = {
  enabled: true,
  threshold_credits: 5,
  pack_slug: "marketplace_5",
};

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/billing/auto-recharge", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  });
}

function makeUpdateChain(error: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(async () => ({ error }));
  return chain;
}

describe("POST /api/pros/billing/auto-recharge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockGetPack.mockReturnValue({ slug: "marketplace_5", isCredit: true, credits: 5 });
    mockAdminFrom.mockReturnValue(makeUpdateChain(null));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing enabled field", async () => {
    const res = await POST(makeReq({ threshold_credits: 5, pack_slug: "marketplace_5" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for threshold_credits out of range", async () => {
    const res = await POST(makeReq({ enabled: true, threshold_credits: 0, pack_slug: "marketplace_5" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-marketplace pack slug", async () => {
    mockGetPack.mockReturnValue({ slug: "lead_5", isCredit: true, credits: 5 });
    const res = await POST(makeReq({ enabled: true, threshold_credits: 5, pack_slug: "lead_5" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown pack slug", async () => {
    mockGetPack.mockReturnValue(null);
    const res = await POST(makeReq({ enabled: true, threshold_credits: 5, pack_slug: "marketplace_unknown" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful update", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB update errors", async () => {
    mockAdminFrom.mockReturnValue(makeUpdateChain({ message: "db error" }));
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });
});

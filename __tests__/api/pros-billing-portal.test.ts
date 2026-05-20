/**
 * Tests for POST /api/pros/billing/portal
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockCreateBillingPortalUrl } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
  mockCreateBillingPortalUrl: vi.fn(async () => ({ url: "https://billing.stripe.com/portal/sess_123" })),
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

vi.mock("@/lib/pro-subscription/billing", () => ({
  createBillingPortalUrl: mockCreateBillingPortalUrl,
}));

import { POST } from "@/app/api/pros/billing/portal/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/billing/portal", { method: "POST" });
}

describe("POST /api/pros/billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockCreateBillingPortalUrl.mockResolvedValue({ url: "https://billing.stripe.com/portal/sess_123" });
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

  it("returns 200 with portal url on success", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toContain("billing.stripe.com");
  });

  it("returns 404 when pro has no billing account", async () => {
    mockCreateBillingPortalUrl.mockResolvedValue({ unavailable: true, reason: "No billing account found" });
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 503 when Stripe not configured", async () => {
    mockCreateBillingPortalUrl.mockResolvedValue({ unavailable: true, reason: "Stripe not configured" });
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
  });

  it("returns 500 on unexpected error", async () => {
    mockCreateBillingPortalUrl.mockRejectedValue(new Error("unexpected"));
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });
});

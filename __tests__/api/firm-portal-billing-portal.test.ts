import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsAllowed = vi.fn().mockResolvedValue(true);
const mockRequireAdvisorSession = vi.fn();
const mockResolveFirmAdminContext = vi.fn();
const mockGetFirmBillingSummary = vi.fn();
const mockCreateBillingPortalUrl = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "ip:test",
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/firm-billing", () => ({
  resolveFirmAdminContext: (...args: unknown[]) =>
    mockResolveFirmAdminContext(...args),
  getFirmBillingSummary: (...args: unknown[]) =>
    mockGetFirmBillingSummary(...args),
}));

vi.mock("@/lib/pro-subscription/billing", () => ({
  createBillingPortalUrl: (...args: unknown[]) =>
    mockCreateBillingPortalUrl(...args),
}));

import { POST } from "@/app/api/firm-portal/billing/portal/route";

function makePost(): NextRequest {
  return new NextRequest(
    "http://localhost/api/firm-portal/billing/portal",
    { method: "POST" },
  );
}

const summary = {
  firmId: 7,
  firmSlug: "acme",
  firmName: "Acme",
  totalCreditBalanceCents: 25000,
  totalLifetimeCreditCents: 50000,
  totalLifetimeSpendCents: 25000,
  activeMemberCount: 3,
  pendingMemberCount: 0,
  lowBalanceMemberCount: 0,
  members: [],
  paymentMethod: {
    advisorId: 42,
    advisorName: "Alice",
    stripeCustomerId: "cus_alice",
  },
};

describe("POST /api/firm-portal/billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makePost());
    expect(res.status).toBe(429);
  });

  it("returns 401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makePost());
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce(null);
    const res = await POST(makePost());
    expect(res.status).toBe(403);
  });

  it("returns 404 when firm has no payment method yet", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce({
      advisorId: 42,
      firmId: 7,
    });
    mockGetFirmBillingSummary.mockResolvedValueOnce({
      ...summary,
      paymentMethod: null,
    });
    const res = await POST(makePost());
    expect(res.status).toBe(404);
  });

  it("returns 503 when Stripe is unconfigured", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce({
      advisorId: 42,
      firmId: 7,
    });
    mockGetFirmBillingSummary.mockResolvedValueOnce(summary);
    mockCreateBillingPortalUrl.mockResolvedValueOnce({
      unavailable: true,
      reason: "Stripe not configured",
    });
    const res = await POST(makePost());
    expect(res.status).toBe(503);
  });

  it("returns the portal URL on success", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce({
      advisorId: 42,
      firmId: 7,
    });
    mockGetFirmBillingSummary.mockResolvedValueOnce(summary);
    mockCreateBillingPortalUrl.mockResolvedValueOnce({
      url: "https://billing.stripe.com/p/session/abc",
    });
    const res = await POST(makePost());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://billing.stripe.com/p/session/abc");
    expect(mockCreateBillingPortalUrl).toHaveBeenCalledWith(42);
  });

  it("returns 500 on unexpected Stripe errors", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce({
      advisorId: 42,
      firmId: 7,
    });
    mockGetFirmBillingSummary.mockResolvedValueOnce(summary);
    mockCreateBillingPortalUrl.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makePost());
    expect(res.status).toBe(500);
  });
});

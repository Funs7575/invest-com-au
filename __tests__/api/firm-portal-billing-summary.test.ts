import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsAllowed = vi.fn().mockResolvedValue(true);
const mockRequireAdvisorSession = vi.fn();
const mockResolveFirmAdminContext = vi.fn();
const mockGetFirmBillingSummary = vi.fn();

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

import { GET } from "@/app/api/firm-portal/billing/summary/route";

function makeGet(): NextRequest {
  return new NextRequest(
    "http://localhost/api/firm-portal/billing/summary",
    { method: "GET" },
  );
}

describe("GET /api/firm-portal/billing/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("returns 404 when firm not found", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce({
      advisorId: 42,
      firmId: 7,
    });
    mockGetFirmBillingSummary.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(404);
  });

  it("returns the summary for an authorised firm admin", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce({
      advisorId: 42,
      firmId: 7,
    });
    mockGetFirmBillingSummary.mockResolvedValueOnce({
      firmId: 7,
      firmSlug: "acme",
      firmName: "Acme",
      totalCreditBalanceCents: 25000,
      totalLifetimeCreditCents: 50000,
      totalLifetimeSpendCents: 25000,
      activeMemberCount: 3,
      pendingMemberCount: 0,
      lowBalanceMemberCount: 1,
      members: [],
      paymentMethod: null,
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary.firmName).toBe("Acme");
    expect(json.summary.activeMemberCount).toBe(3);
  });

  it("returns 500 on unexpected errors", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(42);
    mockResolveFirmAdminContext.mockResolvedValueOnce({
      advisorId: 42,
      firmId: 7,
    });
    mockGetFirmBillingSummary.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});

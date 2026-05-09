import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const mockRequireAdvisorSession = vi.fn();
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockGetSiteUrl = vi.fn(() => "https://invest.com.au");
vi.mock("@/lib/url", () => ({ getSiteUrl: () => mockGetSiteUrl() }));

const mockPortalCreate = vi.fn();
const mockGetStripe = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => mockGetStripe(),
}));

let proRow: { stripe_customer_id: string | null } | null = null;
const mockMaybeSingle = vi.fn(async () => ({ data: proRow }));
const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/advisor-auth/billing-portal/route";

function makeReq(): NextRequest {
  return new NextRequest("https://invest.com.au/api/advisor-auth/billing-portal", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  proRow = null;
  mockIsRateLimited.mockResolvedValue(false);
  mockRequireAdvisorSession.mockResolvedValue(1);
  mockGetStripe.mockReturnValue({
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockPortalCreate(...args),
      },
    },
  });
  mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/abc" });
  proRow = { stripe_customer_id: "cus_123" };
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
});

describe("POST /api/advisor-auth/billing-portal", () => {
  it("429 when rate limit trips", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("404 when advisor has no stripe_customer_id", async () => {
    proRow = { stripe_customer_id: null };
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("503 when Stripe is not configured", async () => {
    mockGetStripe.mockImplementationOnce(() => {
      throw new Error("no stripe key");
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
  });

  it("200 with portal URL on success", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://billing.stripe.com/session/abc");
  });

  it("uses an idempotency key shaped advisor_portal_<id>_<minute>", async () => {
    await POST(makeReq());
    const call = mockPortalCreate.mock.calls[0];
    expect(call?.[1]?.idempotencyKey).toMatch(/^advisor_portal_1_\d+$/);
  });

  it("500 when Stripe call fails", async () => {
    mockPortalCreate.mockRejectedValueOnce(new Error("network"));
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });
});

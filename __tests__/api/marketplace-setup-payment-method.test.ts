import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockCustomersList = vi.fn();
const mockCustomersCreate = vi.fn();
const mockSetupIntentsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    customers: { list: mockCustomersList, create: mockCustomersCreate },
    setupIntents: { create: mockSetupIntentsCreate },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn() }),
}));

import { POST, PATCH } from "@/app/api/marketplace/setup-payment-method/route";

function makeReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/marketplace/setup-payment-method", {
    method,
    headers: { "x-forwarded-for": "1.2.3.4", "content-type": "application/json", "cookie": "" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeAccountBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data })),
  };
}

function makeWalletBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsRateLimited.mockResolvedValue(false);
});

describe("POST /api/marketplace/setup-payment-method", () => {
  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when no active broker account", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeAccountBuilder(null));
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(403);
  });

  it("reuses existing Stripe customer and returns client_secret", async () => {
    const account = { broker_slug: "broker-a", email: "broker@a.com", company_name: "Broker A" };
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeAccountBuilder(account))
      .mockReturnValueOnce(makeWalletBuilder({ stripe_payment_method_id: null }));
    mockCustomersList.mockResolvedValue({ data: [{ id: "cus_existing" }] });
    mockSetupIntentsCreate.mockResolvedValue({ client_secret: "seti_secret", id: "seti_1" });

    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.client_secret).toBe("seti_secret");
    expect(body.customer_id).toBe("cus_existing");
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it("creates new Stripe customer when none exists", async () => {
    const account = { broker_slug: "broker-b", email: "broker@b.com", company_name: "Broker B" };
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeAccountBuilder(account))
      .mockReturnValueOnce(makeWalletBuilder(null));
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
    mockSetupIntentsCreate.mockResolvedValue({ client_secret: "seti_new_secret", id: "seti_2" });

    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.client_secret).toBe("seti_new_secret");
    expect(body.customer_id).toBe("cus_new");
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "broker@b.com", metadata: { broker_slug: "broker-b" } }),
      expect.any(Object)
    );
  });

  it("returns 500 when Stripe throws", async () => {
    const account = { broker_slug: "broker-c", email: "broker@c.com", company_name: "C" };
    mockGetUser.mockResolvedValue({ data: { user: { id: "u3" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeAccountBuilder(account))
      .mockReturnValueOnce(makeWalletBuilder(null));
    mockCustomersList.mockRejectedValue(new Error("Stripe down"));

    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/marketplace/setup-payment-method", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", {}));
    expect(res.status).toBe(401);
  });

  it("returns 403 when no active broker account", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom.mockReturnValueOnce(makeAccountBuilder(null));
    const res = await PATCH(makeReq("PATCH", {}));
    expect(res.status).toBe(403);
  });

  it("updates wallet fields and returns success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom.mockReturnValueOnce(makeAccountBuilder({ broker_slug: "broker-a" }));
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn(() => Promise.resolve({}));
    mockAdminFrom.mockReturnValueOnce({ update: mockUpdate, eq: mockEq });

    const body = { payment_method_id: "pm_abc", auto_topup_enabled: true, threshold_cents: 10000, amount_cents: 50000 };
    const res = await PATCH(makeReq("PATCH", body));
    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_payment_method_id: "pm_abc",
        auto_topup_enabled: true,
        auto_topup_threshold_cents: 10000,
        auto_topup_amount_cents: 50000,
      })
    );
  });

  it("only updates provided fields", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom.mockReturnValueOnce(makeAccountBuilder({ broker_slug: "broker-a" }));
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn(() => Promise.resolve({}));
    mockAdminFrom.mockReturnValueOnce({ update: mockUpdate, eq: mockEq });

    const res = await PATCH(makeReq("PATCH", { auto_topup_enabled: false }));
    expect(res.status).toBe(200);
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.auto_topup_enabled).toBe(false);
    expect(updateArg).not.toHaveProperty("stripe_payment_method_id");
    expect(updateArg).not.toHaveProperty("auto_topup_threshold_cents");
  });
});

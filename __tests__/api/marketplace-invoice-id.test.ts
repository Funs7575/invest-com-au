import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

import { GET } from "@/app/api/marketplace/invoice/[id]/route";

function makeRequest(id: string) {
  return {
    req: new NextRequest(`http://localhost/api/marketplace/invoice/${id}`),
    params: Promise.resolve({ id }),
  };
}

function makeAccountBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data })),
  };
}

function makeInvoiceBuilder(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/marketplace/invoice/[id]", () => {
  it("returns 400 for non-numeric id", async () => {
    const { req, params } = makeRequest("abc");
    const res = await GET(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { req, params } = makeRequest("1");
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when no active broker account", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom.mockReturnValue(makeAccountBuilder(null));
    const { req, params } = makeRequest("5");
    const res = await GET(req, { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when invoice not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeAccountBuilder({ broker_slug: "broker-a" }))
      .mockReturnValueOnce(makeInvoiceBuilder(null));
    const { req, params } = makeRequest("99");
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns invoice when found and belongs to broker", async () => {
    const invoice = { id: 5, broker_slug: "broker-a", amount_cents: 5000 };
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeAccountBuilder({ broker_slug: "broker-a" }))
      .mockReturnValueOnce(makeInvoiceBuilder(invoice));
    const { req, params } = makeRequest("5");
    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoice).toMatchObject(invoice);
    expect(body.invoice.stripe_payment_reference).toBeNull();
  });

  it("never exposes raw payment-processor ids; derives a truncated reference", async () => {
    const longIntent = "pi_" + "x".repeat(40);
    const invoice = {
      id: 7,
      broker_slug: "broker-a",
      amount_cents: 5000,
      stripe_payment_intent_id: longIntent,
      stripe_checkout_session_id: "cs_secret_should_never_appear",
    };
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeAccountBuilder({ broker_slug: "broker-a" }))
      .mockReturnValueOnce(makeInvoiceBuilder(invoice));
    const { req, params } = makeRequest("7");
    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Raw processor ids must not be present anywhere in the payload.
    expect(body.invoice.stripe_payment_intent_id).toBeUndefined();
    expect(body.invoice.stripe_checkout_session_id).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(longIntent);
    expect(JSON.stringify(body)).not.toContain("cs_secret_should_never_appear");
    // Display-only truncated reference is derived (24 chars + ellipsis).
    expect(body.invoice.stripe_payment_reference).toBe(
      `${longIntent.slice(0, 24)}...`,
    );
  });

  it("requests an explicit column list (not select *)", async () => {
    const invoiceBuilder = makeInvoiceBuilder({ id: 5, broker_slug: "broker-a" });
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeAccountBuilder({ broker_slug: "broker-a" }))
      .mockReturnValueOnce(invoiceBuilder);
    const { req, params } = makeRequest("5");
    await GET(req, { params });
    const selectArg = invoiceBuilder.select.mock.calls[0]?.[0] as string;
    expect(selectArg).not.toBe("*");
    expect(selectArg).not.toContain("stripe_checkout_session_id");
  });
});

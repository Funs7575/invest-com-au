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
    expect(body.invoice).toEqual(invoice);
  });
});

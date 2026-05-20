import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

const mockGetUser = vi.fn(async () => ({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

const mockCreatePayment = vi.fn(async () => ({
  clientSecret: "pi_test_secret",
  paymentId: 1,
  paymentIntentId: "pi_test",
}));

vi.mock("@/lib/stripe-connect", () => ({
  createPaymentForBrief: (...args: unknown[]) => mockCreatePayment(...args),
}));

import { POST } from "@/app/api/briefs/[slug]/payment/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/payment", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const validBrief = {
  id: 1,
  contact_email: "consumer@test.com",
  accepted_by_professional_id: 42,
  accepted_at: "2026-05-01T00:00:00Z",
  status: "accepted",
};

describe("/api/briefs/[slug]/payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null });
    mockAdminFrom.mockReturnValue(makeBuilder({ data: validBrief, error: null }));
    mockCreatePayment.mockResolvedValue({
      clientSecret: "pi_test_secret",
      paymentId: 1,
      paymentIntentId: "pi_test",
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ amount_cents: 5000, description: "Advice fee" }), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/briefs/x/payment", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount_cents missing", async () => {
    const res = await POST(makeReq({ description: "Advice fee" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount_cents too small", async () => {
    const res = await POST(makeReq({ amount_cents: 50, description: "Advice fee" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq({ amount_cents: 5000, description: "Advice fee" }), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({ amount_cents: 5000, description: "Advice fee" }), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not brief owner", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "other@test.com" } }, error: null });
    const res = await POST(makeReq({ amount_cents: 5000, description: "Advice fee" }), makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 409 when brief not yet accepted", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({
      data: { ...validBrief, accepted_by_professional_id: null, accepted_at: null },
      error: null,
    }));
    const res = await POST(makeReq({ amount_cents: 5000, description: "Advice fee" }), makeCtx());
    expect(res.status).toBe(409);
  });

  it("returns 200 on happy path", async () => {
    const res = await POST(makeReq({ amount_cents: 5000, description: "Advice fee" }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.client_secret).toBe("pi_test_secret");
  });

  it("returns 503 when Stripe not configured", async () => {
    mockCreatePayment.mockResolvedValue({ unavailable: "no_secret" });
    const res = await POST(makeReq({ amount_cents: 5000, description: "Advice fee" }), makeCtx());
    expect(res.status).toBe(503);
  });
});

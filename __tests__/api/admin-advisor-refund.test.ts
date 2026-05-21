import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const mockStripeRefundsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    refunds: { create: mockStripeRefundsCreate },
    paymentIntents: { retrieve: vi.fn(async () => ({ latest_charge: "ch_test123" })) },
  })),
}));

import { POST } from "@/app/api/admin/advisor-refund/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/advisor-refund", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/advisor-refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
  });

  it("POST denies unauthenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq({
      charge_id: "ch_test",
      refund_reason: "Test refund",
      refund_policy: "credit",
    }));
    expect(res.status).toBe(401);
  });

  it("POST denies non-admin user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "user@example.com" } },
      error: null,
    });
    const res = await POST(makeReq({
      charge_id: "ch_test",
      refund_reason: "Test refund",
      refund_policy: "credit",
    }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid body (missing required fields)", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("POST issues refund with charge_id", async () => {
    mockStripeRefundsCreate.mockResolvedValue({ id: "re_test", amount: 1000 });
    const insertBuilder = makeBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(insertBuilder);

    const res = await POST(makeReq({
      charge_id: "ch_test123",
      refund_reason: "Duplicate charge",
      refund_policy: "cash",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.refund_id).toBe("re_test");
  });
});

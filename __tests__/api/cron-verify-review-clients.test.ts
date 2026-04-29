import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/verify-review-clients/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);

function makeTableChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "update", "gte", "lt", "not", "is", "or", "order", "limit", "in", "upsert", "insert"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(result)));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/verify-review-clients", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

describe("GET /api/cron/verify-review-clients", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns zero counts when no unverified reviews", async () => {
    // Broker path: unverified reviews = [], advisor path: unverified reviews = []
    const emptyChain = makeTableChain({ data: [], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => emptyChain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.broker_verified).toBe(0);
    expect(body.advisor_verified).toBe(0);
    expect(body.total_verified).toBe(0);
  });

  it("verifies broker reviews with matching signup email", async () => {
    const unverifiedReviews = [
      { id: 1, email: "alice@example.com", broker_slug: "stake", broker_id: "b1" },
    ];
    const candidateSignups = [
      { broker_slug: "stake", email: "alice@example.com" },
    ];
    let callIdx = 0;
    const chains = [
      makeTableChain({ data: unverifiedReviews, error: null }),  // user_reviews select
      makeTableChain({ data: candidateSignups, error: null }),    // broker_signups select
      makeTableChain({ data: null, error: null }),                // user_reviews update
      makeTableChain({ data: [], error: null }),                  // professional_reviews select (advisor block)
    ];
    const fromFn = vi.fn(() => chains[Math.min(callIdx++, chains.length - 1)]!);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.broker_verified).toBe(1);
    expect(body.total_verified).toBe(1);
  });

  it("skips broker reviews with no matching signup", async () => {
    const unverifiedReviews = [
      { id: 2, email: "unknown@example.com", broker_slug: "commsec", broker_id: "b2" },
    ];
    const candidateSignups: unknown[] = []; // no match
    let callIdx = 0;
    const chains = [
      makeTableChain({ data: unverifiedReviews, error: null }),
      makeTableChain({ data: candidateSignups, error: null }),
      makeTableChain({ data: [], error: null }), // advisor block
    ];
    const fromFn = vi.fn(() => chains[Math.min(callIdx++, chains.length - 1)]!);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.broker_verified).toBe(0);
  });

  it("verifies advisor reviews with matching lead email", async () => {
    let callIdx = 0;
    const chains = [
      makeTableChain({ data: [], error: null }), // user_reviews (broker block, empty)
      makeTableChain({ data: [{ id: 10, reviewer_email: "bob@example.com", professional_id: "p1" }], error: null }), // professional_reviews
      makeTableChain({ data: [{ id: 5, professional_id: "p1", user_email: "bob@example.com" }], error: null }), // professional_leads
      makeTableChain({ data: null, error: null }), // professional_reviews update
    ];
    const fromFn = vi.fn(() => chains[Math.min(callIdx++, chains.length - 1)]!);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.advisor_verified).toBe(1);
  });

  it("handles broker block exception gracefully and still runs advisor block", async () => {
    let callIdx = 0;
    const throwChain = {
      ...makeTableChain(null),
      then: vi.fn((_resolve: unknown, _reject: unknown) => { throw new Error("DB connection lost"); }),
    };
    const chains = [
      throwChain, // broker block throws
      makeTableChain({ data: [], error: null }), // professional_reviews
    ];
    const fromFn = vi.fn(() => chains[Math.min(callIdx++, chains.length - 1)]!);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.broker_verified).toBe(0);
  });
});

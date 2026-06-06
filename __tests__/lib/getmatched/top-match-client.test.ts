import { describe, it, expect, vi, beforeEach } from "vitest";

// `quiz_weights` is being locked to non-anon (commercially-sensitive tuned
// weights, previously extractable via the embedded anon key). top-match is the
// public, unauthenticated /api/get-matched/resolve path with no admin JWT, so
// it must read via the service-role admin client — NOT the RLS-respecting anon
// server client, which would return nothing once the SELECT policy is locked.
const { mockCreateAdminClient } = vi.hoisted(() => ({ mockCreateAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mockCreateAdminClient }));
// The anon server client must NOT be used; importing it pulls in this mock so
// we can assert it is never instantiated.
const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mockCreateClient }));
vi.mock("@/lib/logger", () => ({
  logger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }),
}));

import { computeTopMatch, computeTopMatches } from "@/lib/getmatched/top-match";

const broker = {
  slug: "acme",
  name: "Acme Invest",
  status: "active",
  rating: 4.5,
  logo_url: null,
  chess_sponsored: true,
  is_crypto: false,
  asx_fee_value: 5,
};

const weightRow = {
  broker_slug: "acme",
  beginner_weight: 10,
  low_fee_weight: 0,
  us_shares_weight: 0,
  smsf_weight: 0,
  crypto_weight: 0,
  advanced_weight: 0,
  property_weight: 0,
  robo_weight: 0,
};

/** Builds a supabase-like client whose `.from()` returns table-specific data. */
function makeClient() {
  return {
    from: vi.fn((table: string) => {
      const result =
        table === "brokers"
          ? { data: [broker], error: null }
          : { data: [weightRow], error: null };
      // brokers chains `.select().eq()`, quiz_weights chains `.select()`.
      const chain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve(result)),
          then: (resolve: (v: unknown) => unknown) => resolve(result),
        })),
      };
      return chain;
    }),
  };
}

describe("top-match uses the service-role client (quiz_weights is non-anon)", () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockCreateAdminClient.mockReset();
  });

  it("computeTopMatch reads via createAdminClient(), never the anon client", async () => {
    mockCreateAdminClient.mockReturnValue(makeClient());

    const res = await computeTopMatch({ intent: "grow" }, null);

    expect(mockCreateAdminClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(res).not.toBeNull();
    expect(res?.slug).toBe("acme");
  });

  it("computeTopMatches reads via createAdminClient(), never the anon client", async () => {
    mockCreateAdminClient.mockReturnValue(makeClient());

    const res = await computeTopMatches({ intent: "grow" }, null, 3);

    expect(mockCreateAdminClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]?.slug).toBe("acme");
  });
});

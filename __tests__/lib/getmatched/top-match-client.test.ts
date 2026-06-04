import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression guard for the service-role → anon-client swap:
// `brokers` (anon SELECT on status='active') and `quiz_weights` (anon SELECT
// USING TRUE) are public anon-readable tables, so top-match must use the
// RLS-respecting anon server client — NOT the service-role admin client.
const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: mockCreateClient }));
// If the production code ever reaches for the admin client again, importing it
// would pull in this mock; assert it is never instantiated.
const { mockCreateAdminClient } = vi.hoisted(() => ({ mockCreateAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mockCreateAdminClient }));
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

describe("top-match uses the anon server client (least-privilege)", () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockCreateAdminClient.mockReset();
  });

  it("computeTopMatch reads via createClient(), never the admin client", async () => {
    mockCreateClient.mockResolvedValue(makeClient());

    const res = await computeTopMatch({ intent: "grow" }, null);

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(res).not.toBeNull();
    expect(res?.slug).toBe("acme");
  });

  it("computeTopMatches reads via createClient(), never the admin client", async () => {
    mockCreateClient.mockResolvedValue(makeClient());

    const res = await computeTopMatches({ intent: "grow" }, null, 3);

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]?.slug).toBe("acme");
  });
});

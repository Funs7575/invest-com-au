import { describe, it, expect, vi } from "vitest";

// top-match.ts imports the anon server client at module scope; stub it
// so importing the pure reshape helper needs no env / DB.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { reshapeWeightRow } from "@/lib/getmatched/top-match";

describe("reshapeWeightRow", () => {
  it("maps the flat *_weight DB columns onto the scorer's unsuffixed WeightKeys", () => {
    expect(
      reshapeWeightRow({
        broker_slug: "acme",
        beginner_weight: 1,
        low_fee_weight: 2,
        us_shares_weight: 3,
        smsf_weight: 4,
        crypto_weight: 5,
        advanced_weight: 6,
        property_weight: 7,
        robo_weight: 8,
      }),
    ).toEqual({
      beginner: 1, low_fee: 2, us_shares: 3, smsf: 4,
      crypto: 5, advanced: 6, property: 7, robo: 8,
    });
  });

  it("coerces null columns to 0 — the regression: keys must never be undefined", () => {
    const w = reshapeWeightRow({
      broker_slug: "acme",
      beginner_weight: null,
      low_fee_weight: null,
      us_shares_weight: null,
      smsf_weight: null,
      crypto_weight: null,
      advanced_weight: null,
      property_weight: null,
      robo_weight: null,
    });
    expect(w).toEqual({
      beginner: 0, low_fee: 0, us_shares: 0, smsf: 0,
      crypto: 0, advanced: 0, property: 0, robo: 0,
    });
    // The bug produced `undefined` for every key (wrong column names); the
    // scorer then read `undefined → 0`. Assert all 8 keys are real numbers.
    const keys = ["beginner", "low_fee", "us_shares", "smsf", "crypto", "advanced", "property", "robo"] as const;
    for (const k of keys) expect(typeof w[k]).toBe("number");
  });
});

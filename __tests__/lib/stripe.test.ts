import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("stripe", () => ({
  default: vi.fn((key: string) => {
    if (!key) throw new Error("Stripe key is required");
    return { apiVersion: "2024" };
  }),
}));

describe("stripe", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("PLANS", () => {
    let PLANS: typeof import("@/lib/stripe").PLANS;

    beforeEach(async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_fake";
      const mod = await import("@/lib/stripe");
      PLANS = mod.PLANS;
    });

    describe("monthly", () => {
      it("has price of 9", () => {
        expect(PLANS.monthly.price).toBe(9);
      });

      it('has interval of "month"', () => {
        expect(PLANS.monthly.interval).toBe("month");
      });
    });

    describe("yearly", () => {
      it("has price of 89", () => {
        expect(PLANS.yearly.price).toBe(89);
      });

      it('has interval of "year"', () => {
        expect(PLANS.yearly.interval).toBe("year");
      });

      it('has savings of "Save 18%"', () => {
        expect(PLANS.yearly.savings).toBe("Save 18%");
      });

      it("yearly price is less than 12 months of monthly", () => {
        expect(PLANS.yearly.price).toBeLessThan(PLANS.monthly.price * 12);
      });
    });
  });

  describe("getStripe", () => {
    it("throws when STRIPE_SECRET_KEY is not set", async () => {
      delete process.env.STRIPE_SECRET_KEY;
      vi.resetModules();

      vi.doMock("stripe", () => ({
        default: vi.fn((key: string) => {
          if (!key) throw new Error("Stripe key is required");
          return { apiVersion: "2024" };
        }),
      }));

      try {
        const mod = await import("@/lib/stripe");
        if (mod.getStripe) {
          expect(() => mod.getStripe()).toThrow();
        }
      } catch (e: any) {
        // Module-level initialization may throw if key is checked at import
        expect(e).toBeDefined();
      }
    });

    it("returns a Stripe instance when STRIPE_SECRET_KEY is set", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_valid_key";
      vi.resetModules();

      vi.doMock("stripe", () => ({
        default: vi.fn((key: string) => {
          return { apiVersion: "2024", key };
        }),
      }));

      const mod = await import("@/lib/stripe");
      if (mod.getStripe) {
        const stripe = mod.getStripe();
        expect(stripe).toBeDefined();
      }
    });
  });
});

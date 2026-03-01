import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe constructor
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({ customers: {}, subscriptions: {} })),
}));

describe("PLANS", () => {
  it("has monthly and yearly plans", async () => {
    const { PLANS } = await import("@/lib/stripe");
    expect(PLANS.monthly).toBeDefined();
    expect(PLANS.yearly).toBeDefined();
  });

  it("monthly plan is $9/month", async () => {
    const { PLANS } = await import("@/lib/stripe");
    expect(PLANS.monthly.price).toBe(9);
    expect(PLANS.monthly.interval).toBe("month");
    expect(PLANS.monthly.label).toBe("$9/month");
  });

  it("yearly plan is $89/year", async () => {
    const { PLANS } = await import("@/lib/stripe");
    expect(PLANS.yearly.price).toBe(89);
    expect(PLANS.yearly.interval).toBe("year");
    expect(PLANS.yearly.label).toBe("$89/year");
    expect(PLANS.yearly.savings).toBe("Save 18%");
  });
});

describe("getStripe", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws when STRIPE_SECRET_KEY is not set", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripe } = await import("@/lib/stripe");
    expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY is not set");
  });

  it("returns Stripe instance when key is set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    const { getStripe } = await import("@/lib/stripe");
    const stripe = getStripe();
    expect(stripe).toBeDefined();
    expect(stripe).toHaveProperty("customers");
  });
});

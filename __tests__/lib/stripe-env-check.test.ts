import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { checkStripeEnv } from "@/lib/stripe-env-check";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL };
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PRICE_ID_STARTER;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("checkStripeEnv", () => {
  it("returns ok:true when every required var is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    process.env.STRIPE_PRICE_ID_STARTER = "price_x";
    expect(checkStripeEnv({ required: ["STRIPE_PRICE_ID_STARTER"] })).toEqual({
      ok: true,
      missing: [],
    });
  });

  it("reports missing baseline vars (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)", () => {
    process.env.STRIPE_PRICE_ID_STARTER = "price_x";
    const result = checkStripeEnv({ required: ["STRIPE_PRICE_ID_STARTER"] });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("STRIPE_SECRET_KEY");
    expect(result.missing).toContain("STRIPE_WEBHOOK_SECRET");
    expect(result.missing).not.toContain("STRIPE_PRICE_ID_STARTER");
  });

  it("reports missing per-tier price id only when required by the caller", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    const result = checkStripeEnv({ required: ["STRIPE_PRICE_ID_STARTER"] });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["STRIPE_PRICE_ID_STARTER"]);
  });

  it("dedupes baseline + per-tier required names without breaking the report", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    process.env.STRIPE_PRICE_ID_GROWTH = "price_g";
    const result = checkStripeEnv({
      required: ["STRIPE_PRICE_ID_STARTER", "STRIPE_PRICE_ID_GROWTH"],
    });
    expect(result.missing).toEqual(["STRIPE_PRICE_ID_STARTER"]);
  });

  it("returns an empty required list as a baseline-only check", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    expect(checkStripeEnv({ required: [] })).toEqual({ ok: true, missing: [] });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
  BRANDED_PROFILE_PRICE_ENV,
  getBrandedProfilePriceId,
  isEntitledStatus,
  mapStripeStatusToBranded,
} from "@/lib/firm-branded-profile";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getBrandedProfilePriceId", () => {
  it("returns the configured env price id", () => {
    vi.stubEnv(BRANDED_PROFILE_PRICE_ENV, "price_branded_123");
    expect(getBrandedProfilePriceId()).toBe("price_branded_123");
  });

  it("returns null when the env var is unset", () => {
    vi.stubEnv(BRANDED_PROFILE_PRICE_ENV, "");
    expect(getBrandedProfilePriceId()).toBeNull();
  });
});

describe("isEntitledStatus", () => {
  it("entitles active and trialing", () => {
    expect(isEntitledStatus("active")).toBe(true);
    expect(isEntitledStatus("trialing")).toBe(true);
  });

  it("does not entitle past_due, canceled, inactive, or nullish", () => {
    expect(isEntitledStatus("past_due")).toBe(false);
    expect(isEntitledStatus("canceled")).toBe(false);
    expect(isEntitledStatus("inactive")).toBe(false);
    expect(isEntitledStatus(null)).toBe(false);
    expect(isEntitledStatus(undefined)).toBe(false);
    expect(isEntitledStatus("something_else")).toBe(false);
  });
});

describe("mapStripeStatusToBranded", () => {
  const cases: [Stripe.Subscription.Status, string][] = [
    ["active", "active"],
    ["trialing", "trialing"],
    ["past_due", "past_due"],
    ["unpaid", "past_due"],
    ["canceled", "canceled"],
    ["incomplete_expired", "canceled"],
    ["incomplete", "inactive"],
    ["paused", "inactive"],
  ];

  it.each(cases)("maps Stripe %s → %s", (stripeStatus, expected) => {
    expect(mapStripeStatusToBranded(stripeStatus)).toBe(expected);
  });

  it("only entitles the active/trialing mappings", () => {
    expect(isEntitledStatus(mapStripeStatusToBranded("active"))).toBe(true);
    expect(isEntitledStatus(mapStripeStatusToBranded("trialing"))).toBe(true);
    expect(isEntitledStatus(mapStripeStatusToBranded("past_due"))).toBe(false);
    expect(isEntitledStatus(mapStripeStatusToBranded("canceled"))).toBe(false);
  });
});

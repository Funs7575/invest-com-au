import { describe, it, expect } from "vitest";

import {
  AFFILIATE_CREDIT_RATES,
  getCreditAwardForEvent,
} from "@/lib/pro-affiliate/rates";

describe("pro-affiliate/rates", () => {
  it("awards 1 credit for signup", () => {
    expect(getCreditAwardForEvent("signup")).toBe(1);
  });

  it("awards 3 credits for brief_created", () => {
    expect(getCreditAwardForEvent("brief_created")).toBe(3);
  });

  it("awards 10 credits for brief_accepted", () => {
    expect(getCreditAwardForEvent("brief_accepted")).toBe(10);
  });

  it("keeps rates ordered so funnel-bottom events outweigh funnel-top", () => {
    expect(AFFILIATE_CREDIT_RATES.brief_accepted).toBeGreaterThan(
      AFFILIATE_CREDIT_RATES.brief_created,
    );
    expect(AFFILIATE_CREDIT_RATES.brief_created).toBeGreaterThan(
      AFFILIATE_CREDIT_RATES.signup,
    );
  });

  it("returns non-negative integers for every defined event", () => {
    for (const event of [
      "signup",
      "brief_created",
      "brief_accepted",
    ] as const) {
      const v = getCreditAwardForEvent(event);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

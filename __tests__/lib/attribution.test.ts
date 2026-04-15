import { describe, it, expect } from "vitest";
import { classifyChannel, rollupAttribution } from "@/lib/attribution";

describe("classifyChannel", () => {
  it("returns paid for cpc medium", () => {
    expect(classifyChannel({ source: "google", medium: "cpc" })).toBe("paid");
    expect(classifyChannel({ source: "facebook", medium: "paid" })).toBe("paid");
  });

  it("returns email for email medium or source", () => {
    expect(classifyChannel({ source: null, medium: "email" })).toBe("email");
    expect(classifyChannel({ source: "email", medium: null })).toBe("email");
  });

  it("returns organic for known search sources", () => {
    expect(classifyChannel({ source: "google", medium: null })).toBe("organic");
    expect(classifyChannel({ source: "bing", medium: "organic" })).toBe("organic");
  });

  it("returns social for known social sources", () => {
    expect(classifyChannel({ source: "facebook", medium: null })).toBe("social");
    expect(classifyChannel({ source: "linkedin", medium: null })).toBe("social");
  });

  it("returns referral when medium is referral or referrer is set", () => {
    expect(classifyChannel({ source: null, medium: "referral" })).toBe("referral");
    expect(classifyChannel({ source: null, medium: null, hasReferrer: true })).toBe("referral");
  });

  it("returns direct when nothing else matches", () => {
    expect(classifyChannel({ source: null, medium: null })).toBe("direct");
  });
});

describe("rollupAttribution", () => {
  it("returns empty when no rows", () => {
    expect(rollupAttribution([])).toEqual({});
  });

  it("counts touches per channel", () => {
    const result = rollupAttribution([
      { session_id: "s1", channel: "organic", event: "view", value_cents: null },
      { session_id: "s1", channel: "organic", event: "view", value_cents: null },
      { session_id: "s2", channel: "paid", event: "view", value_cents: null },
    ]);
    expect(result.organic?.touches).toBe(2);
    expect(result.paid?.touches).toBe(1);
  });

  it("credits first-touch to the first channel in the session", () => {
    const result = rollupAttribution([
      { session_id: "s1", channel: "organic", event: "view", value_cents: null },
      { session_id: "s1", channel: "email", event: "view", value_cents: null },
      { session_id: "s1", channel: "direct", event: "conversion", value_cents: 10000 },
    ]);
    expect(result.organic?.firstTouchConversions).toBe(1);
    expect(result.email?.firstTouchConversions).toBe(0);
    expect(result.direct?.firstTouchConversions).toBe(0);
  });

  it("credits last-touch to the channel of the conversion event", () => {
    const result = rollupAttribution([
      { session_id: "s1", channel: "organic", event: "view", value_cents: null },
      { session_id: "s1", channel: "email", event: "conversion", value_cents: 10000 },
    ]);
    expect(result.email?.lastTouchConversions).toBe(1);
    expect(result.organic?.lastTouchConversions).toBe(0);
  });

  it("splits linear credit evenly across distinct channels", () => {
    const result = rollupAttribution([
      { session_id: "s1", channel: "organic", event: "view", value_cents: null },
      { session_id: "s1", channel: "email", event: "view", value_cents: null },
      { session_id: "s1", channel: "paid", event: "conversion", value_cents: 30000 },
    ]);
    expect(result.organic?.linearConversions).toBeCloseTo(1 / 3);
    expect(result.email?.linearConversions).toBeCloseTo(1 / 3);
    expect(result.paid?.linearConversions).toBeCloseTo(1 / 3);
    // Revenue split evenly
    expect(result.organic?.revenueCents).toBe(10000);
    expect(result.paid?.revenueCents).toBe(10000);
  });

  it("keeps sessions separate", () => {
    const result = rollupAttribution([
      { session_id: "s1", channel: "organic", event: "conversion", value_cents: 100 },
      { session_id: "s2", channel: "paid", event: "conversion", value_cents: 200 },
    ]);
    expect(result.organic?.firstTouchConversions).toBe(1);
    expect(result.paid?.firstTouchConversions).toBe(1);
  });
});

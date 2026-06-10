import { describe, it, expect } from "vitest";
import { getMatchReasons, type PlatformBrokerAttrs } from "@/lib/quiz-platform-match-reasons";

// ── Helpers ────────────────────────────────────────────────────────────────

function broker(overrides: Partial<PlatformBrokerAttrs> = {}): PlatformBrokerAttrs {
  return {
    platform_type: "share_broker",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    ...overrides,
  };
}

// ── Core contract: always returns 1–4 bullets, never empty ────────────────

describe("getMatchReasons — core contract", () => {
  it("returns at least one bullet for any broker", () => {
    const r = getMatchReasons([], broker());
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  it("caps at 4 bullets by default", () => {
    const r = getMatchReasons(["fees", "safety", "tools", "beginner", "large"], broker({
      chess_sponsored: true,
      smsf_support: true,
      asx_fee: "$9.50",
      us_fee: "$0",
      rating: 4.8,
    }));
    expect(r.length).toBeLessThanOrEqual(4);
  });

  it("respects custom max parameter for runner-ups (max=2)", () => {
    const r = getMatchReasons(["fees", "safety", "tools", "large"], broker({
      chess_sponsored: true,
      asx_fee: "$5",
      rating: 4.8,
    }), 2);
    expect(r.length).toBeLessThanOrEqual(2);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  it("returns no duplicate bullets", () => {
    const r = getMatchReasons(["fees", "safety", "tools", "large", "beginner"], broker({
      chess_sponsored: true,
      asx_fee: "$9.50",
      rating: 4.8,
    }));
    const unique = new Set(r);
    expect(unique.size).toBe(r.length);
  });
});

// ── Share broker — attribute-driven ──────────────────────────────────────

describe("getMatchReasons — share broker attribute signals", () => {
  it("surfaces zero-brokerage claim for asx_fee_value=0", () => {
    const r = getMatchReasons([], broker({ asx_fee_value: 0 }));
    expect(r.some(b => /zero brokerage/i.test(b))).toBe(true);
  });

  it("references the actual fee when user wants fees", () => {
    const r = getMatchReasons(["fees"], broker({ asx_fee: "$9.50" }));
    expect(r.some(b => /\$9\.50/i.test(b))).toBe(true);
  });

  it("mentions CHESS sponsorship when user wants safety", () => {
    const r = getMatchReasons(["safety"], broker({ chess_sponsored: true }));
    expect(r.some(b => /chess/i.test(b))).toBe(true);
  });

  it("mentions CHESS sponsorship even without explicit safety signal", () => {
    const r = getMatchReasons(["fees"], broker({ chess_sponsored: true }));
    expect(r.some(b => /chess/i.test(b))).toBe(true);
  });

  it("does NOT mention CHESS when broker is not CHESS sponsored", () => {
    const r = getMatchReasons(["safety"], broker({ chess_sponsored: false }));
    expect(r.some(b => /chess/i.test(b))).toBe(false);
  });

  it("mentions SMSF support when relevant answers and smsf_support=true", () => {
    const r = getMatchReasons(["super"], broker({ smsf_support: true }));
    expect(r.some(b => /smsf/i.test(b))).toBe(true);
  });

  it("does NOT mention SMSF when smsf_support=false", () => {
    const r = getMatchReasons(["super"], broker({ smsf_support: false }));
    expect(r.some(b => /smsf/i.test(b))).toBe(false);
  });

  it("surfaces rating when rating >= 4.5", () => {
    const r = getMatchReasons([], broker({ rating: 4.8 }));
    expect(r.some(b => /4\.8\/5/i.test(b))).toBe(true);
  });

  it("surfaces rating when rating >= 4.0", () => {
    const r = getMatchReasons([], broker({ rating: 4.2 }));
    expect(r.some(b => /4\.2\/5/i.test(b))).toBe(true);
  });

  it("does NOT surface rating when rating < 4.0", () => {
    const r = getMatchReasons([], broker({ rating: 3.5 }));
    expect(r.some(b => /\/5/i.test(b))).toBe(false);
  });

  it("mentions beginner-friendliness for simple/beginner answers", () => {
    const r = getMatchReasons(["beginner"], broker());
    expect(r.some(b => /beginner|interface|simple/i.test(b))).toBe(true);
  });

  it("mentions international share fees for large amounts when us_fee set", () => {
    const r = getMatchReasons(["large"], broker({ us_fee: "$0" }));
    expect(r.some(b => /international|us/i.test(b))).toBe(true);
  });
});

// ── Platform-type specific ─────────────────────────────────────────────────

describe("getMatchReasons — robo_advisor", () => {
  it("mentions automation", () => {
    const r = getMatchReasons([], broker({ platform_type: "robo_advisor" }));
    expect(r.some(b => /automat/i.test(b))).toBe(true);
  });

  it("mentions min_deposit when available", () => {
    const r = getMatchReasons([], broker({ platform_type: "robo_advisor", min_deposit: "$500" }));
    expect(r.some(b => /\$500/i.test(b))).toBe(true);
  });

  it("mentions rating when >= 4.0", () => {
    const r = getMatchReasons([], broker({ platform_type: "robo_advisor", rating: 4.3 }));
    expect(r.some(b => /4\.3\/5/i.test(b))).toBe(true);
  });
});

describe("getMatchReasons — crypto_exchange", () => {
  it("mentions AUSTRAC registration", () => {
    const r = getMatchReasons(["crypto"], broker({ platform_type: "crypto_exchange", is_crypto: true }));
    expect(r.some(b => /austrac/i.test(b))).toBe(true);
  });

  it("mentions AUD pairs for crypto answers", () => {
    const r = getMatchReasons(["crypto"], broker({ platform_type: "crypto_exchange", is_crypto: true }));
    expect(r.some(b => /aud/i.test(b))).toBe(true);
  });

  it("recognises is_crypto=true on non-crypto platform_type", () => {
    const r = getMatchReasons([], broker({ platform_type: "share_broker", is_crypto: true }));
    expect(r.some(b => /austrac/i.test(b))).toBe(true);
  });
});

describe("getMatchReasons — super_fund", () => {
  it("mentions performance for rated fund", () => {
    const r = getMatchReasons(["super"], broker({ platform_type: "super_fund", rating: 4.6 }));
    expect(r.some(b => /4\.6\/5/i.test(b))).toBe(true);
  });

  it("still returns bullets for unrated fund", () => {
    const r = getMatchReasons([], broker({ platform_type: "super_fund" }));
    expect(r.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getMatchReasons — property_platform", () => {
  it("mentions no-stamp-duty and fractional investing", () => {
    const r = getMatchReasons([], broker({ platform_type: "property_platform" }));
    expect(r.some(b => /stamp duty/i.test(b))).toBe(true);
    expect(r.some(b => /\$100/i.test(b) || /fractional|property/i.test(b))).toBe(true);
  });
});

describe("getMatchReasons — savings_account", () => {
  it("mentions government deposit guarantee", () => {
    const r = getMatchReasons([], broker({ platform_type: "savings_account" }));
    expect(r.some(b => /250,000|deposit guarantee/i.test(b))).toBe(true);
  });
});

// ── Fallback ────────────────────────────────────────────────────────────────

describe("getMatchReasons — fallback", () => {
  it("never returns an empty array even for empty broker with no answers", () => {
    const r = getMatchReasons([], { platform_type: "share_broker" });
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  it("fallback includes a non-empty string", () => {
    const r = getMatchReasons([], { platform_type: "share_broker" });
    expect(r.every(s => s.length > 0)).toBe(true);
  });
});

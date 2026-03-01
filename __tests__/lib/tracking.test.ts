import { describe, it, expect } from "vitest";
import {
  getAffiliateLink,
  getBenefitCta,
  formatPercent,
  renderStars,
  AFFILIATE_REL,
} from "@/lib/tracking";

function mockBroker(overrides: Record<string, unknown> = {}) {
  return {
    slug: "test-broker",
    name: "Test Broker",
    affiliate_url: null,
    benefit_cta: null,
    cta_text: null,
    deal: false,
    deal_text: null,
    asx_fee: null,
    asx_fee_value: null,
    ...overrides,
  } as any;
}

describe("AFFILIATE_REL", () => {
  it("equals the standard sponsored rel string", () => {
    expect(AFFILIATE_REL).toBe("noopener noreferrer nofollow sponsored");
  });

  it("contains noopener for security", () => {
    expect(AFFILIATE_REL).toContain("noopener");
  });

  it("contains sponsored for SEO compliance", () => {
    expect(AFFILIATE_REL).toContain("sponsored");
  });
});

describe("getAffiliateLink", () => {
  it("returns /go/<slug> when broker has affiliate_url", () => {
    const broker = mockBroker({
      slug: "stake",
      affiliate_url: "https://stake.com.au",
    });
    expect(getAffiliateLink(broker)).toBe("/go/stake");
  });

  it("returns /broker/<slug> when broker has no affiliate_url", () => {
    const broker = mockBroker({ slug: "stake", affiliate_url: "" });
    expect(getAffiliateLink(broker)).toBe("/broker/stake");
  });

  it("returns /broker/<slug> when affiliate_url is null", () => {
    const broker = mockBroker({ slug: "local-broker", affiliate_url: null });
    expect(getAffiliateLink(broker)).toBe("/broker/local-broker");
  });

  it("returns correct path for different slugs", () => {
    const broker = mockBroker({
      slug: "cmc-markets",
      affiliate_url: "https://cmc.example.com",
    });
    expect(getAffiliateLink(broker)).toBe("/go/cmc-markets");
  });
});

describe("getBenefitCta", () => {
  it("returns custom benefit_cta when set", () => {
    const broker = mockBroker({ benefit_cta: "Custom CTA" });
    expect(getBenefitCta(broker, "compare")).toBe("Custom CTA");
  });

  it("returns cta_text when set and no benefit_cta", () => {
    const broker = mockBroker({ cta_text: "Try Now" });
    expect(getBenefitCta(broker, "compare")).toBe("Try Now");
  });

  it("prefers benefit_cta over cta_text", () => {
    const broker = mockBroker({
      benefit_cta: "Benefit CTA",
      cta_text: "CTA Text",
    });
    expect(getBenefitCta(broker, "compare")).toBe("Benefit CTA");
  });

  it('returns "Trade $0 Brokerage →" for compare context with asx_fee_value: 0', () => {
    const broker = mockBroker({ asx_fee_value: 0 });
    expect(getBenefitCta(broker, "compare")).toBe("Trade $0 Brokerage →");
  });

  it("returns trade-from CTA for compare context with low fee (<=5)", () => {
    const broker = mockBroker({ asx_fee_value: 5, asx_fee: "$5.00" });
    const result = getBenefitCta(broker, "compare");
    expect(result).toContain("Trade");
    expect(result).toContain("→");
  });

  it('returns "Open Free Account →" for compare context with regular fee', () => {
    const broker = mockBroker({ asx_fee_value: 10 });
    expect(getBenefitCta(broker, "compare")).toBe("Open Free Account →");
  });

  it('returns "Get Started Free →" for quiz context with no cta_text', () => {
    const broker = mockBroker({});
    expect(getBenefitCta(broker, "quiz")).toBe("Get Started Free →");
  });

  it("returns deal text when deal=true and deal_text set", () => {
    const broker = mockBroker({
      deal: true,
      deal_text: "Free trades for 30 days",
      name: "Stake",
    });
    expect(getBenefitCta(broker, "compare")).toBe("Claim Stake Deal");
  });

  it("still uses benefit_cta even when deal is active", () => {
    const broker = mockBroker({
      benefit_cta: "Special Offer",
      deal: true,
      deal_text: "Limited Deal",
    });
    expect(getBenefitCta(broker, "compare")).toBe("Special Offer");
  });

  it("handles review context", () => {
    const broker = mockBroker({ asx_fee_value: 10 });
    const result = getBenefitCta(broker, "review");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles calculator context", () => {
    const broker = mockBroker({ asx_fee_value: 10 });
    const result = getBenefitCta(broker, "calculator");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles versus context", () => {
    const broker = mockBroker({ asx_fee_value: 10 });
    const result = getBenefitCta(broker, "versus");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatPercent", () => {
  it("formats with default 2 decimal places", () => {
    expect(formatPercent(0.5)).toBe("0.50%");
  });

  it("formats with custom decimal places", () => {
    expect(formatPercent(12.345, 1)).toBe("12.3%");
  });

  it("formats with 0 decimal places", () => {
    expect(formatPercent(3.14159, 0)).toBe("3%");
  });

  it("formats with 4 decimal places", () => {
    expect(formatPercent(3.14159, 4)).toBe("3.1416%");
  });

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("handles whole numbers", () => {
    expect(formatPercent(5)).toBe("5.00%");
  });

  it("handles large numbers", () => {
    expect(formatPercent(100)).toBe("100.00%");
  });
});

describe("renderStars", () => {
  it("renders 5 full stars for rating 5", () => {
    expect(renderStars(5)).toBe("★★★★★");
  });

  it("renders 5 empty stars for rating 0", () => {
    expect(renderStars(0)).toBe("☆☆☆☆☆");
  });

  it("renders half star correctly for 3.5", () => {
    expect(renderStars(3.5)).toBe("★★★½☆");
  });

  it("rounds down fractional ratings below 0.5", () => {
    expect(renderStars(4.2)).toBe("★★★★☆");
  });

  it("renders correctly for 4.5", () => {
    expect(renderStars(4.5)).toBe("★★★★½");
  });

  it("renders correctly for 1.0", () => {
    expect(renderStars(1)).toBe("★☆☆☆☆");
  });

  it("renders correctly for 2.5", () => {
    expect(renderStars(2.5)).toBe("★★½☆☆");
  });

  it("renders correctly for 0.5", () => {
    expect(renderStars(0.5)).toBe("½☆☆☆☆");
  });

  it("always produces a string of length 5", () => {
    for (const rating of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]) {
      expect(renderStars(rating)).toHaveLength(5);
    }
  });
});

import { describe, it, expect } from "vitest";
import { getAffiliateLink, getBenefitCta, formatPercent, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

function makeBroker(overrides: Partial<Broker> = {}): Broker {
  return {
    id: 1,
    name: "TestBroker",
    slug: "testbroker",
    affiliate_url: null,
    asx_fee: "$5",
    asx_fee_value: 5,
    us_fee: null,
    us_fee_value: null,
    fx_rate: null,
    inactivity_fee: null,
    rating: 4.5,
    deal: false,
    deal_text: null,
    deal_terms: null,
    deal_expiry: null,
    cta_text: null,
    benefit_cta: null,
    is_crypto: false,
    chess_sponsored: true,
    regulated_by: "ASIC",
    year_founded: 2010,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    ...overrides,
  } as Broker;
}

describe("AFFILIATE_REL", () => {
  it("includes nofollow and sponsored", () => {
    expect(AFFILIATE_REL).toContain("nofollow");
    expect(AFFILIATE_REL).toContain("sponsored");
    expect(AFFILIATE_REL).toContain("noopener");
    expect(AFFILIATE_REL).toContain("noreferrer");
  });
});

describe("getAffiliateLink", () => {
  it("returns /go/{slug} when affiliate_url exists", () => {
    const broker = makeBroker({ slug: "stake", affiliate_url: "https://stake.com.au" });
    expect(getAffiliateLink(broker)).toBe("/go/stake");
  });

  it("returns /broker/{slug} when no affiliate_url", () => {
    const broker = makeBroker({ slug: "commsec", affiliate_url: null });
    expect(getAffiliateLink(broker)).toBe("/broker/commsec");
  });

  it("returns /broker/ for empty string affiliate_url", () => {
    const broker = makeBroker({ slug: "test", affiliate_url: "" });
    expect(getAffiliateLink(broker)).toBe("/broker/test");
  });
});

describe("getBenefitCta", () => {
  it("returns benefit_cta if set", () => {
    const broker = makeBroker({ benefit_cta: "Custom CTA" });
    expect(getBenefitCta(broker, "compare")).toBe("Custom CTA");
  });

  it("returns cta_text if set and no benefit_cta", () => {
    const broker = makeBroker({ cta_text: "Custom Text" });
    expect(getBenefitCta(broker, "compare")).toBe("Custom Text");
  });

  it("returns deal-specific CTA when broker has a deal", () => {
    const broker = makeBroker({ deal: true, deal_text: "Free trades for 30 days", name: "Stake" });
    expect(getBenefitCta(broker, "compare")).toBe("Claim Stake Deal");
  });

  it("returns $0 brokerage CTA for compare context", () => {
    const broker = makeBroker({ asx_fee_value: 0 });
    expect(getBenefitCta(broker, "compare")).toBe("Trade $0 Brokerage →");
  });

  it("returns low fee CTA for cheap brokers in compare", () => {
    const broker = makeBroker({ asx_fee_value: 3, asx_fee: "$3" });
    expect(getBenefitCta(broker, "compare")).toBe("Trade from $3 →");
  });

  it("returns default for compare with normal fees", () => {
    const broker = makeBroker({ asx_fee_value: 10 });
    expect(getBenefitCta(broker, "compare")).toBe("Open Free Account →");
  });

  it("returns calculator-specific CTA for $0 brokerage", () => {
    const broker = makeBroker({ asx_fee_value: 0 });
    expect(getBenefitCta(broker, "calculator")).toBe("Try $0 Brokerage →");
  });

  it("returns quiz-specific default CTA", () => {
    const broker = makeBroker({});
    expect(getBenefitCta(broker, "quiz")).toBe("Get Started Free →");
  });
});

describe("formatPercent", () => {
  it("formats with default 2 decimals", () => {
    expect(formatPercent(0.5)).toBe("0.50%");
  });

  it("formats with custom decimals", () => {
    expect(formatPercent(1.234, 1)).toBe("1.2%");
  });

  it("formats whole numbers", () => {
    expect(formatPercent(5, 0)).toBe("5%");
  });
});

describe("renderStars", () => {
  it("renders 5 full stars", () => {
    expect(renderStars(5)).toBe("★★★★★");
  });

  it("renders 0 stars", () => {
    expect(renderStars(0)).toBe("☆☆☆☆☆");
  });

  it("renders half star at 2.5", () => {
    expect(renderStars(2.5)).toBe("★★½☆☆");
  });

  it("renders 4 full + 1 empty at 4.3", () => {
    expect(renderStars(4.3)).toBe("★★★★☆");
  });

  it("renders 4 full + half at 4.7", () => {
    expect(renderStars(4.7)).toBe("★★★★½");
  });
});

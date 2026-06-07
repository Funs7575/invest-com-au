import { describe, it, expect } from "vitest";
import {
  PROVIDER_NOUNS,
  providerNounForIntent,
  complianceVariantForIntent,
} from "@/lib/getmatched/intent-presentation";
import { FALLBACK_INTENTS } from "@/lib/getmatched/fallbacks";

describe("providerNounForIntent", () => {
  it("prefers the admin-editable DB value", () => {
    expect(
      providerNounForIntent({ slug: "opportunity_assessment", provider_noun: "deal review pros" }),
    ).toBe("deal review pros");
  });

  it("falls back to the code map by slug when the DB value is null", () => {
    expect(
      providerNounForIntent({ slug: "opportunity_assessment", provider_noun: null }),
    ).toBe("opportunity assessment specialists");
  });

  it("ignores blank/whitespace DB values", () => {
    expect(
      providerNounForIntent({ slug: "opportunity_assessment", provider_noun: "   " }),
    ).toBe("opportunity assessment specialists");
  });

  it("uses a grammatical generic for an unknown slug", () => {
    expect(providerNounForIntent({ slug: "brand_new_intent" })).toBe("verified providers");
  });
});

describe("PROVIDER_NOUNS completeness", () => {
  it("covers every shipped fallback-intent slug", () => {
    for (const intent of FALLBACK_INTENTS) {
      expect(PROVIDER_NOUNS[intent.slug], `missing provider_noun for "${intent.slug}"`).toBeTruthy();
    }
  });

  it("covers the NZ intents seeded by mm26", () => {
    expect(PROVIDER_NOUNS["nz_kiwisaver"]).toBeTruthy();
    expect(PROVIDER_NOUNS["nz_property_buy"]).toBeTruthy();
  });

  it("nouns slot into 'Best <noun> in <state>' — no leading imperative verb", () => {
    const imperatives = new Set([
      "assess", "buy", "get", "compare", "start", "post", "prepare", "earn", "browse", "optimise",
    ]);
    for (const [slug, noun] of Object.entries(PROVIDER_NOUNS)) {
      expect(noun.length, slug).toBeGreaterThan(3);
      const firstWord = noun.split(/\s+/)[0]!.toLowerCase();
      expect(imperatives.has(firstWord), `"${noun}" (${slug}) starts with an imperative verb`).toBe(false);
    }
  });
});

describe("complianceVariantForIntent", () => {
  it("maps each asset class to the right ASIC risk-warning variant", () => {
    expect(complianceVariantForIntent({ slug: "crypto" })).toBe("crypto");
    expect(complianceVariantForIntent({ slug: "trade" })).toBe("cfd");
    expect(complianceVariantForIntent({ slug: "foreign_investor" })).toBe("firb");
    expect(complianceVariantForIntent({ slug: "commercial_property" })).toBe("property");
    expect(complianceVariantForIntent({ slug: "nz_property_buy" })).toBe("property");
  });

  it("defaults to the general-advice variant", () => {
    expect(complianceVariantForIntent({ slug: "opportunity_assessment" })).toBe("default");
    expect(complianceVariantForIntent({ slug: "financial_advice" })).toBe("default");
  });
});

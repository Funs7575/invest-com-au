import { describe, it, expect } from "vitest";
import {
  HOMEPAGE_GOAL_CHIPS,
  getEmbedConfig,
  isEmbedContext,
} from "@/lib/getmatched/embeds";

describe("getEmbedConfig", () => {
  it("returns a config for every supported context", () => {
    const contexts = [
      "homepage",
      "smsf_guide",
      "opportunity",
      "advisor_directory",
      "platform_compare",
    ] as const;
    for (const c of contexts) {
      const cfg = getEmbedConfig(c);
      expect(cfg.context).toBe(c);
      expect(cfg.headline).toBeTruthy();
      expect(cfg.subtitle).toBeTruthy();
    }
  });

  it("pre-fills intent for non-homepage contexts", () => {
    expect(getEmbedConfig("smsf_guide").intent_prefill).toBe("smsf_property");
    expect(getEmbedConfig("opportunity").intent_prefill).toBe("opportunity_assessment");
    expect(getEmbedConfig("advisor_directory").intent_prefill).toBe("financial_advice");
    expect(getEmbedConfig("platform_compare").intent_prefill).toBe("compare_platform");
  });

  it("homepage has no intent pre-fill (chip picker)", () => {
    expect(getEmbedConfig("homepage").intent_prefill).toBeUndefined();
  });
});

describe("isEmbedContext", () => {
  it("accepts the 5 contexts", () => {
    expect(isEmbedContext("homepage")).toBe(true);
    expect(isEmbedContext("smsf_guide")).toBe(true);
    expect(isEmbedContext("opportunity")).toBe(true);
    expect(isEmbedContext("advisor_directory")).toBe(true);
    expect(isEmbedContext("platform_compare")).toBe(true);
  });
  it("rejects others", () => {
    expect(isEmbedContext("nope")).toBe(false);
    expect(isEmbedContext(123)).toBe(false);
  });
});

describe("HOMEPAGE_GOAL_CHIPS", () => {
  it("has all 9 chips from the PDF spec", () => {
    expect(HOMEPAGE_GOAL_CHIPS.length).toBe(9);
  });

  it("every chip has value/label/icon", () => {
    for (const c of HOMEPAGE_GOAL_CHIPS) {
      expect(c.value).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.icon).toBeTruthy();
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  AUSTRALIAN_STATES,
  bestPageMeta,
  defaultFaqs,
  generateBestCombos,
  getStateBySlug,
} from "@/lib/seo/best-pages";

describe("AUSTRALIAN_STATES", () => {
  it("covers all 8 Australian states + territories", () => {
    expect(AUSTRALIAN_STATES.length).toBe(8);
    const codes = AUSTRALIAN_STATES.map((s) => s.code).sort();
    expect(codes).toEqual(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]);
  });
});

describe("getStateBySlug", () => {
  it("returns the state for a known slug", () => {
    expect(getStateBySlug("nsw")?.code).toBe("NSW");
    expect(getStateBySlug("nt")?.fullName).toBe("Northern Territory");
  });

  it("returns null for an unknown slug", () => {
    expect(getStateBySlug("xx")).toBe(null);
  });
});

describe("bestPageMeta", () => {
  const noun = "opportunity assessment specialists";

  it("uses the provider noun (not the imperative label) in the title and H1", () => {
    const m = bestPageMeta({
      intentSlug: "opportunity_assessment",
      intentNoun: noun,
      state: AUSTRALIAN_STATES[0]!,
    });
    expect(m.h1).toBe("Best opportunity assessment specialists in New South Wales");
    expect(m.title).toContain("Best opportunity assessment specialists in New South Wales");
    // never the broken "Best Assess an opportunity in ..." copy
    expect(m.h1).not.toContain("Assess an opportunity");
  });

  it("uses 'Australia' and the all-AU canonical when no state is given", () => {
    const m = bestPageMeta({ intentSlug: "financial_advice", intentNoun: "financial advisers" });
    expect(m.h1).toBe("Best financial advisers in Australia");
    expect(m.canonical).toContain("/marketplace/financial_advice");
    expect(m.canonical).not.toContain("/nsw");
  });

  it("builds the canonical from the SLUG, not the slugified noun (noindex-404 regression)", () => {
    const m = bestPageMeta({
      intentSlug: "opportunity_assessment",
      intentNoun: noun,
      state: AUSTRALIAN_STATES[0]!,
    });
    expect(m.canonical).toMatch(/^https?:\/\//);
    expect(m.canonical).toContain("/marketplace/opportunity_assessment/nsw");
    // the old bug slugified the label/noun → "assess-an-opportunity" / "...-specialists"
    expect(m.canonical).not.toContain("assess-an-opportunity");
    expect(m.canonical).not.toContain("specialists");
  });

  it("does not double-brand the title (the layout title template adds the brand)", () => {
    const m = bestPageMeta({
      intentSlug: "financial_advice",
      intentNoun: "financial advisers",
      state: AUSTRALIAN_STATES[0]!,
    });
    expect(m.title).not.toContain("| Invest.com.au");
    expect(m.title).not.toContain("Invest.com.au");
  });
});

describe("generateBestCombos", () => {
  it("produces intent × state cross-product", () => {
    const combos = generateBestCombos(["smsf_property", "financial_advice"]);
    expect(combos.length).toBe(2 * AUSTRALIAN_STATES.length);
    expect(combos[0]).toEqual({ intent: "smsf_property", state: "nsw" });
  });

  it("returns empty array for empty intents", () => {
    expect(generateBestCombos([])).toEqual([]);
  });
});

describe("defaultFaqs", () => {
  it("returns 3 Q&A items", () => {
    expect(defaultFaqs("financial advisers").length).toBe(3);
  });

  it("mentions the state name when provided", () => {
    const faqs = defaultFaqs("SMSF property specialists", "Queensland");
    expect(faqs.some((f) => f.q.includes("Queensland"))).toBe(true);
  });

  it("reads grammatically with the provider noun", () => {
    const faqs = defaultFaqs("opportunity assessment specialists", "New South Wales");
    expect(faqs[0]!.q).toContain("opportunity assessment specialists");
    expect(faqs[0]!.q).not.toContain("Assess an opportunity");
  });
});

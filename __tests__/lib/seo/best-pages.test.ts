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
  it("includes state in title when state is provided", () => {
    const m = bestPageMeta({
      intentLabel: "SMSF Property Advice",
      state: AUSTRALIAN_STATES[0]!,
    });
    expect(m.title).toContain("SMSF Property Advice");
    expect(m.title).toContain("New South Wales");
    expect(m.h1).toBe("Best SMSF Property Advice in New South Wales");
  });

  it("uses 'Australia' when no state", () => {
    const m = bestPageMeta({ intentLabel: "Financial Advice" });
    expect(m.title).toContain("Australia");
    expect(m.h1).toBe("Best Financial Advice in Australia");
  });

  it("emits an absolute canonical URL", () => {
    const m = bestPageMeta({
      intentLabel: "Financial Advice",
      state: AUSTRALIAN_STATES[0]!,
    });
    expect(m.canonical).toMatch(/^https?:\/\//);
    expect(m.canonical).toContain("/marketplace/financial-advice/nsw");
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
    expect(defaultFaqs("Financial Advice").length).toBe(3);
  });

  it("mentions the state name when provided", () => {
    const faqs = defaultFaqs("SMSF help", "Queensland");
    expect(faqs.some((f) => f.q.includes("Queensland"))).toBe(true);
  });
});
